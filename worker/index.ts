import projects, { allRepos, projectBySlug, GITHUB_USER } from "../src/data/projects";

const GITHUB_PAGES_ORIGIN = `https://${GITHUB_USER.toLowerCase()}.github.io`;

// Rewrite rules for projects where URL path != GitHub Pages path
const rewriteRules: { from: string; to: string }[] = [];
for (const p of projects) {
  const docsPrefix = p.docsPath.slice(1);
  if (docsPrefix !== p.slug) {
    rewriteRules.push({ from: `/${docsPrefix}/`, to: `/${p.slug}/` });
  }
}

function rewriteBody(body: string): string {
  let result = body;
  for (const rule of rewriteRules) {
    result = result.replaceAll(rule.from, rule.to);
  }
  return result;
}

function needsRewrite(slug: string): boolean {
  const p = projectBySlug[slug];
  return p ? p.docsPath.slice(1) !== slug : false;
}

interface Env {
  ASSETS: Fetcher;
  ANALYTICS: AnalyticsEngineDataset;
  GITHUB_TOKEN?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // ===== /api/stats — cached GitHub stats proxy =====
    if (path === "/api/stats") {
      const cache = caches.default;
      const cacheKey = new Request(url.toString());
      const cached = await cache.match(cacheKey);
      if (cached) return cached;

      const ghHeaders: Record<string, string> = {
        "User-Agent": "app-snaix-homes",
        "Accept": "application/vnd.github.v3+json",
      };
      if (env.GITHUB_TOKEN) {
        ghHeaders["Authorization"] = `token ${env.GITHUB_TOKEN}`;
      }

      try {
        const [repoResults, userResult, commitResult] = await Promise.all([
          Promise.all(allRepos.map(async (repo) => {
            const r = await fetch(`https://api.github.com/repos/${repo}`, { headers: ghHeaders });
            if (!r.ok) return { repo, stars: 0 };
            const d = await r.json() as any;
            return { repo, stars: d.stargazers_count ?? 0 };
          })),
          fetch(`https://api.github.com/users/${GITHUB_USER}`, { headers: ghHeaders })
            .then(r => r.ok ? r.json() : { public_repos: 0 }) as Promise<any>,
          fetch(`https://api.github.com/search/commits?q=author:${GITHUB_USER}&per_page=1`, {
            headers: { ...ghHeaders, "Accept": "application/vnd.github.cloak-preview+json" },
          }).then(r => r.ok ? r.json() : { total_count: 0 }) as Promise<any>,
        ]);

        const stats = {
          repos: Object.fromEntries(repoResults.map(r => [r.repo, r.stars])),
          totalStars: repoResults.reduce((sum, r) => sum + r.stars, 0),
          totalRepos: userResult.public_repos,
          totalCommits: commitResult.total_count,
        };

        const hasData = stats.totalStars > 0;
        const resp = new Response(JSON.stringify(stats), {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": hasData ? "public, max-age=300" : "no-cache",
          },
        });
        if (hasData) ctx.waitUntil(cache.put(cacheKey, resp.clone()));
        return resp;
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), {
          status: 502,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
        });
      }
    }

    // Google Search Console verification
    if (path === "/google80fdfef54cf8d504.html") {
      return new Response("google-site-verification: google80fdfef54cf8d504.html\n", {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    // Match /<slug>/...
    const match = path.match(/^\/([^/]+)(\/.*)?$/);
    const slug = match?.[1];
    const project = slug ? projectBySlug[slug] : null;

    // Not a project route — serve static assets
    if (!project) {
      return env.ASSETS.fetch(request);
    }

    const subPath = match![2] || "/";

    // Analytics
    const isInstall = subPath === "/install";
    const isRelease = subPath.startsWith("/releases/");
    const isStaticAsset = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|json)$/i.test(subPath);
    if (isInstall || isRelease || (!isStaticAsset && subPath === "/")) {
      const requestType = isInstall ? "install" : isRelease ? "release" : "visit";
      const country = request.headers.get("CF-IPCountry") || "unknown";
      env.ANALYTICS.writeDataPoint({
        blobs: [slug, requestType, country, subPath],
        indexes: [slug],
      });
    }

    // /<slug>/install
    if (isInstall) {
      if (!project.scriptFile) {
        return new Response("This project does not have a shell installer. Download from /releases/ instead.", { status: 404 });
      }
      const scriptUrl = `https://raw.githubusercontent.com/${project.repo}/main/${project.scriptFile}`;
      const response = await fetch(scriptUrl);
      if (!response.ok) {
        return new Response("Failed to fetch install script", { status: 502 });
      }
      let scriptContent = await response.text();
      scriptContent = scriptContent.replace(
        /DOWNLOAD_URL=".*"/,
        `DOWNLOAD_URL="${url.origin}/${slug}/releases/latest/download/\${ASSET_NAME}"`
      );
      return new Response(scriptContent, {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    // /<slug>/releases/*
    if (isRelease) {
      const cache = caches.default;
      const cacheKey = new Request(url.toString(), request);
      const cached = await cache.match(cacheKey);
      if (cached) return cached;

      const targetUrl = `https://github.com/${project.repo}${subPath}`;
      const response = await fetch(targetUrl, { headers: { "User-Agent": "app-proxy" } });
      if (!response.ok) {
        return new Response("Release not found", { status: response.status });
      }
      const resp = new Response(response.body, { status: response.status, headers: response.headers });
      resp.headers.set("Cache-Control", "public, max-age=3600");
      ctx.waitUntil(cache.put(cacheKey, resp.clone()));
      return resp;
    }

    // /<slug>/... → proxy GitHub Pages docs
    const docsTargetPath = subPath === "/" ? `${project.docsPath}/` : `${project.docsPath}${subPath}`;
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const targetUrl = `${GITHUB_PAGES_ORIGIN}${docsTargetPath}`;
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": request.headers.get("User-Agent") || "app-proxy",
        "Accept": request.headers.get("Accept") || "*/*",
      },
    });
    if (!response.ok) {
      return new Response("Not Found", { status: 404 });
    }

    const contentType = response.headers.get("Content-Type") || "";
    const isHTML = contentType.includes("text/html");
    const shouldRewrite = needsRewrite(slug) &&
      (isHTML || contentType.includes("javascript") || contentType.includes("text/css"));

    let resp: Response;
    if (shouldRewrite && !isHTML) {
      const body = await response.text();
      resp = new Response(rewriteBody(body), { status: response.status, headers: response.headers });
    } else if (isHTML) {
      const canonicalUrl = `https://app.snaix.homes/${slug}${subPath}`;
      let transformed = new HTMLRewriter()
        .on("head", {
          element(el) { el.append(`<link rel="canonical" href="${canonicalUrl}" />`, { html: true }); },
        })
        .on('meta[property="og:url"]', {
          element(el) { el.setAttribute("content", canonicalUrl); },
        })
        .transform(response);

      if (shouldRewrite) {
        const body = await transformed.text();
        resp = new Response(rewriteBody(body), { status: transformed.status, headers: transformed.headers });
      } else {
        resp = transformed;
      }
    } else {
      resp = new Response(response.body, { status: response.status, headers: response.headers });
    }

    resp.headers.set("Cache-Control", "public, max-age=600");
    ctx.waitUntil(cache.put(cacheKey, resp.clone()));
    return resp;
  },
};
