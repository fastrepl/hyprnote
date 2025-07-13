import { NavLink as MantineNavLink, NavLinkProps as MantineNavLinkProps } from "@mantine/core";
import { createLink, LinkProps } from "@tanstack/react-router";

const CustomLink = createLink(MantineNavLink);

export type NavLinkProps = Omit<MantineNavLinkProps, "component" | "href"> & LinkProps;

export const NavLink = CustomLink as React.ComponentType<NavLinkProps>;

NavLink.displayName = "NavLink";
