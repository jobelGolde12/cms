For your **Google Stitch → Freebuff → working website** workflow, use **PNG screenshots as the primary format**, plus the actual assets/code if Stitch provides them.

### Recommended export

| What                                | Format                  | Why                                 |
| ----------------------------------- | ----------------------- | ----------------------------------- |
| Full UI screens                     | **PNG**                 | Best visual reference for Freebuff  |
| Logo                                | **SVG**                 | Keeps it sharp and reusable         |
| Icons                               | **SVG**                 | Best for web implementation         |
| Photos/illustrations                | **PNG/WebP**            | Preserves visual quality            |
| Stitch-generated code, if available | **HTML/CSS/React/etc.** | Gives Freebuff implementation clues |
| Design documentation                | **Markdown (`.md`)**    | Easy for the coding agent to read   |
| Color/font specs                    | **Markdown / CSS**      | Easy to convert into design tokens  |

### For your project, I would organize it like this

```text
child-mapping-system/
│
├── design/
│   ├── screenshots/
│   │   ├── 01-login.png
│   │   ├── 02-dashboard.png
│   │   ├── 03-child-registry.png
│   │   ├── 04-child-profile.png
│   │   ├── 05-add-child.png
│   │   ├── 06-validation.png
│   │   ├── 07-barangay-monitoring.png
│   │   ├── 08-reports.png
│   │   ├── 09-qr-verification.png
│   │   ├── 10-activity-logs.png
│   │   └── 11-user-management.png
│   │
│   ├── assets/
│   │   ├── logo.svg
│   │   ├── icons/
│   │   └── images/
│   │
│   └── DESIGN.md
│
├── src/
├── public/
├── package.json
└── ...
```

### Most important: export the screens individually

Don't give Freebuff just **one huge screenshot** containing the entire Stitch project.

Export each important screen separately:

**Dashboard → PNG**
**Child Registry → PNG**
**Child Profile → PNG**
**Validation → PNG**
etc.

That allows the agent to work like:

> "Implement `03-child-registry.png`."

rather than trying to interpret a massive image.

### PNG resolution

Export at the **highest reasonable resolution** Stitch allows.

For desktop screens, something around:

**1440 × 900** or **1440 × 1024**

is excellent.

If Stitch provides a mobile design, export that separately too:

**390 × 844** or similar.

So you could have:

```text
screenshots/
├── desktop/
│   ├── dashboard.png
│   ├── child-registry.png
│   └── ...
│
└── mobile/
    ├── dashboard.png
    ├── child-registry.png
    └── ...
```

**If Stitch gives you actual generated HTML/React code, keep that too.** Don't throw it away—the agent can use it as a starting reference, while the PNG remains the visual source of truth.

For the Stitch export

* Create the DESIGN.md template
* Define the screenshot naming scheme
