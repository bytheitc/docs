import type { HouseId } from "@/lib/houses";

export const EVENT_FORMATS = ["In person", "Online", "Hybrid"] as const;

export interface ItcEvent {
  slug: string;
  title: string;
  hosts: HouseId[];
  hostLabel: string;
  cadence: string;
  format: (typeof EVENT_FORMATS)[number];
  date: string;
  location: string;
  summary: string;
  body: string[];
  agenda: string[];
  forWhom: string;
}