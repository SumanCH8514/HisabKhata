# Hisab Khata Mobile Design Patterns

This document outlines the color palette and visual tokens used for the mobile version of the Hisab Khata application (specifically the `/customers` page). These patterns are inspired by the Khatabook mobile interface.

## 1. Primary Branding
- **Brand Blue**: `#0057BB`
  - **Usage**: Mobile Header background, Action Buttons (FAB), Sidebar Icons, and Primary Links.
  - **Text on Brand Blue**: Pure White (`#FFFFFF`).

## 2. Transaction Logic (Give/Get)
The application follows a strict color-coded logic for financial entries:

### You'll Give (Red / Debit)
- **Primary Text**: `text-red-500`
- **Soft Background**: `bg-red-50` (or `bg-red-50/30` for tints)
- **Border/Stroke**: `#F4C7C3`
- **Icon**: `call_made` (North East Arrow)

### You'll Get (Green / Credit)
- **Primary Text**: `text-green-600`
- **Soft Background**: `bg-green-50` (or `bg-green-50/30` for tints)
- **Border/Stroke**: `#B7E1CD`
- **Icon**: `south_east` (South East Arrow)

## 3. Backgrounds & Surfaces
- **Global Page Background**: `#F5F7F9` (Light neutral blue-gray)
- **Empty State Surface**: `#eff2f5`
- **Card Surfaces**: Pure White (`#FFFFFF`) with subtle shadows.
- **Dividers**: `border-gray-100` (Light) or `border-gray-200` (Standard).

## 4. Typography Patterns
- **Header Title**: `font-bold`, `text-base` (approx 16px).
- **Amount (Large)**: `font-black`, `text-xl` or `text-2xl`.
- **Labels**: `font-extrabold`, `uppercase`, `tracking-widest`, `text-[9px]` to `text-[11px]`.
- **Time/Date**: `text-gray-400`, `font-medium`, `text-[10px]`.

## 5. Interaction States
- **Hover/Active**: `bg-gray-50` or `active:scale-95` for buttons.
- **Selected Item**: `bg-blue-50/50` or `border-l-4 border-blue-600`.
