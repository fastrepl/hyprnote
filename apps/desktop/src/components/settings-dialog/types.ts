import { type data } from "./constants";

export type NavItem = (typeof data.nav)[number];
export type NavNames = NavItem["name"];
