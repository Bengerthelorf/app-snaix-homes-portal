export const GITHUB_USER = "Bengerthelorf";

export const THEME = {
  dark: "#0a0a0f",
  light: "#faf8ff",
} as const;

export interface Project {
  slug: string;
  name: string;
  repo: string;
  docsPath: string;
  desc: string;
  tags: string[];
  installCmd?: string;
  installLabel?: string;
  scriptFile?: string;
  preview: "icons" | "terminal-cli" | "terminal-tui" | "menubar";
}

const projects: Project[] = [
  {
    slug: "iconchanger",
    name: "IconChanger",
    repo: `${GITHUB_USER}/macIconChanger`,
    docsPath: "/macIconChanger",
    desc: "Customize any macOS app icon — GUI, CLI, macOSicons.com search, auto-restore. 30 languages.",
    tags: ["swift", "macos"],
    installCmd: `brew install ${GITHUB_USER}/tap/iconchanger`,
    installLabel: "brew install",
    preview: "icons",
  },
  {
    slug: "bcmr",
    name: "bcmr",
    repo: `${GITHUB_USER}/bcmr`,
    docsPath: "/bcmr",
    desc: "Modern file ops — progress bars, resume & verify, parallel SSH transfers, shell integration.",
    tags: ["rust", "cli"],
    installCmd: "curl -fsSL app.snaix.homes/bcmr/install | bash",
    installLabel: "curl install",
    scriptFile: "install.sh",
    preview: "terminal-cli",
  },
  {
    slug: "pikpaktui",
    name: "pikpaktui",
    repo: `${GITHUB_USER}/pikpaktui`,
    docsPath: "/pikpaktui",
    desc: "PikPak cloud TUI — browse, download, upload, stream, offline tasks. Pure Rust, Miller columns.",
    tags: ["rust", "cli"],
    installCmd: `brew install ${GITHUB_USER}/tap/pikpaktui`,
    installLabel: "brew install",
    scriptFile: "install.sh",
    preview: "terminal-tui",
  },
  {
    slug: "claudit",
    name: "Claudit",
    repo: `${GITHUB_USER}/Claudit`,
    docsPath: "/Claudit",
    desc: "macOS menu bar — Claude API cost, tokens, quota, heatmaps, session browser. Multi-device SSH. Fully local.",
    tags: ["swift", "macos"],
    installCmd: `brew install ${GITHUB_USER}/tap/claudit`,
    installLabel: "brew install",
    preview: "menubar",
  },
];

export default projects;

export const allTags = [...new Set(projects.flatMap((p) => p.tags))];
export const allRepos = projects.map((p) => p.repo);
export const projectBySlug = Object.fromEntries(projects.map((p) => [p.slug, p]));
