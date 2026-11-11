# Copyright and Content

## Policy

This project implements a digital adaptation of *Four Against Darkness — Expanded Edition* by Andrea Sfiligoi, published by Ganesha Games.

We respect intellectual property and follow these guidelines:

## What We Do

- Implement game **mechanics** (rules, procedures, algorithms) as original code
- Write original interface descriptions, help text, and UI copy
- Use original or properly licensed artwork and assets
- Keep source references (book page numbers) for verification
- Distribute only independently authored code and data

## What We Don't Do

- ❌ Copy the book's prose into the application
- ❌ Reproduce illustrations without permission
- ❌ Redistribute scanned or extracted rulebook pages
- ❌ Scrape and republish proprietary content
- ❌ Use official branding in a way that implies publisher endorsement
- ❌ Include copyrighted tables, text, or images in the public repository

## Distinction: Mechanics vs. Expression

| Category | Example | Status |
|----------|---------|--------|
| **Mechanic** | "Roll 2d6, add Strength, compare to target number" | ✅ Implementable |
| **Expression** | "The fighter's blade flashes in the torchlight as he strikes" | ❌ Not included |
| **Table Data** | Exact monster stats from book | ❌ Not redistributed |
| **Algorithm** | How to generate a dungeon room from a table | ✅ Implementable |

## Rules Data Handling

The rules database (`src/rulesets/expanded/`) will contain:
- Structured data representing game mechanics
- Original code that *implements* the procedures
- References to book pages for verification

The rules database will **NOT** contain:
- Copied tables from the book
- Book prose or flavor text
- Scanned images

## Asset Licensing

All visual assets must be:
- Original artwork created for this project, OR
- Properly licensed (CC0, CC-BY, etc.) with attribution

No assets from the published rulebook or Ganesha Games materials.

## Publisher Permission

We will seek permission from Ganesha Games before:
- Distributing any data that might be considered protected expression
- Using the "Four Against Darkness" name in marketing
- Releasing on app stores

## Attribution

The application will include a Credits screen acknowledging:
- Game design: Andrea Sfiligoi
- Publisher: Ganesha Games
- This implementation: Independent digital adaptation

## Compliance

The public GitHub repository contains only:
- Original TypeScript/React code
- Original documentation
- Original asset files (or properly licensed third-party assets)
- Data schemas and algorithms

No copyrighted content from the rulebook is committed to this repository.