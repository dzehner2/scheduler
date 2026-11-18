"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Bookings" },
  { href: "/dashboard/event-types", label: "Booking links" },
  { href: "/dashboard/calendars", label: "Calendars and settings" },
  { href: "/dashboard/footprint", label: "Footprint" },
];
const adminLinks = [
  { href: "/dashboard/users", label: "Users" },
  { href: "/dashboard/waitlist", label: "Waitlist" },
];

export default function NavLinks({ admin = false }: { admin?: boolean }) {
  const path = usePathname();
  return (
    <>
      {(admin ? [...links, ...adminLinks] : links).map((l) => {
        const active = l.href === "/dashboard" ? path === l.href : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={active ? "active" : undefined}>
            {l.label}
          </Link>
        );
      })}
    </>
  );
}
