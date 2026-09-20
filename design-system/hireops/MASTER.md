# HireOps Design System MASTER Specification

## Visual Identity & Institutional References
- **Visual Language Reference**: Oman Investment Authority (`https://oia.gov.om/en`) - Sovereign Investment / Executive Government aesthetic.
- **Color Palette Sampling & Reference Tokens**:
  - **Background (`--background`)**: `#FAFAF7` (Warm Institutional Off-White)
  - **Foreground / Text (`--foreground`)**: `#1C1917` (Deep Charcoal / Institutional Slate)
  - **Card / Workspaces (`--card`)**: `#FFFFFF` (Pure Executive White)
  - **Primary Accent (`--primary`)**: `#C5A059` (Muted Omani Gold)
  - **Hover Accent**: `#A38038` (Dark Muted Gold)
  - **Supporting Surface (`--secondary`)**: `#F4F1EA` (Soft Sand Surface)
  - **Muted Tint (`--muted`)**: `#EFECE4` (Light Sand Tint)
  - **Sidebar Surface (`--sidebar`)**: `#0F172A` (Executive Dark Navy Sidebar)
  - **Borders (`--border`)**: `#E7E5E4` (Crisp Neutral Sand Border)

## Semantic Status Tokens
- **Success**: `#047857` (Forest Emerald)
- **Warning**: `#D97706` (Warm Amber)
- **Info**: `#1E40AF` (Executive Navy Blue)
- **Destructive**: `#B91C1C` (Executive Crimson)

## Component Specifications
- **Cards & Workspace Panels**: White `#FFFFFF` background with 1px `#E7E5E4` border and 0.55rem border radius.
- **Buttons**:
  - `primary`: Gradient brand `#C5A059` to `#A38038` with white text.
  - `outline`: White background with 1px `#E7E5E4` border and charcoal text.
  - `ghost`: Transparent background with dark charcoal hover state.
- **Typography**: Single unified font family (`Geist Sans` / `system-ui` fallback).
- **RTL / Localization**: Full native support for English (`en`) and Arabic (`ar`, `dir="rtl"`).
