export interface LoadingEntry {
  message: string;
  icon: string;
}

const entries: LoadingEntry[] = [
  { message: "Lighting the candles…",          icon: "/icons/Loading/4.jpg" },
  { message: "Stirring the pot…",              icon: "/icons/Loading/5.jpg" },
  { message: "Folding in the flavours…",       icon: "/icons/Loading/6.jpg" },
  { message: "Tying on the apron…",            icon: "/icons/Loading/7.jpg" },
  { message: "Letting it simmer…",             icon: "/icons/Loading/8.jpg" },
  { message: "Consulting the family cookbook…",icon: "/icons/Loading/9.jpg" },
  { message: "Setting the table…",             icon: "/icons/Loading/10.jpg" },
  { message: "Rolling out the dough…",         icon: "/icons/Loading/1.jpg" },
  { message: "Grinding the spices…",           icon: "/icons/Loading/2.jpg" },
  { message: "Raiding the pantry…",            icon: "/icons/Loading/3.jpg" },
  { message: "Whisking things together…",      icon: "/icons/Loading/cozy kitchen scenes1.jpg" },
  { message: "Uncorking the inspiration…",     icon: "/icons/Loading/cozy kitchen scenes2.jpg" },
  { message: "Rolling out the dough…",         icon: "/icons/Loading/cozy kitchen scenes3.jpg" },
  { message: "Folding in the flavours…",       icon: "/icons/Loading/cozy kitchen scenes4.jpg" },
  { message: "Checking what's in the fridge…", icon: "/icons/Loading/cozy kitchen scenes5.jpg" },
  { message: "Sprinkling a little magic…",     icon: "/icons/Loading/cozy kitchen scenes6.jpg" },
  { message: "Grinding the spices…",           icon: "/icons/Loading/cozy kitchen scenes7.jpg" },
  { message: "Plating with care…",             icon: "/icons/Loading/cozy kitchen scenes8.jpg" },
  { message: "Whisking things together…",      icon: "/icons/Loading/cozy kitchen scenes9.jpg" },
  { message: "Stirring the pot…",              icon: "/icons/Loading/cozy kitchen scenes10.jpg" },
  { message: "Asking Nonna for her secret…",   icon: "/icons/Loading/cozy kitchen scenes11.jpg" },
  { message: "Preheating the oven…",           icon: "/icons/Loading/cozy kitchen scenes12.jpg" },
  { message: "Setting the table…",             icon: "/icons/Loading/cozy kitchen scenes13.jpg" },
  { message: "Rolling out the dough…",         icon: "/icons/Loading/cozy kitchen scenes14.jpg" },
  { message: "Tasting for seasoning…",         icon: "/icons/Loading/cozy kitchen scenes15.jpg" },
  { message: "Uncorking the inspiration…",     icon: "/icons/Loading/cozy kitchen scenes16.jpg" },
];

export function randomLoadingEntry(): LoadingEntry {
  return entries[Math.floor(Math.random() * entries.length)];
}

// Keep backward compat
export function randomLoadingMessage(): string {
  return randomLoadingEntry().message;
}
