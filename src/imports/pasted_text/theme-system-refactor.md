Fix the complete theme color system across MantraAssist.

Current issue:
Theme colors are not applied consistently. Main dashboard content changes, but sidebar, menu text, icons, active state, user profile area, borders, charts, and some panels still use old/static colors.

Goal:
Create one global theme system where every UI area uses theme variables only. No hardcoded colors should remain.

Theme System Structure:

Create global variables:

Background:
- bg.app
- bg.sidebar
- bg.surface
- bg.surfaceAlt
- bg.modal
- bg.dropdown

Text:
- text.primary
- text.secondary
- text.muted
- text.inverse

Border:
- border.default
- border.strong

Accent:
- accent.primary
- accent.secondary
- accent.soft
- accent.hover
- accent.active

Status:
- status.success
- status.warning
- status.error
- status.info

Charts:
- chart.primary
- chart.secondary
- chart.success
- chart.error
- chart.warning
- chart.grid
- chart.axis

Sidebar:
- sidebar.bg
- sidebar.text
- sidebar.textMuted
- sidebar.icon
- sidebar.iconActive
- sidebar.itemHoverBg
- sidebar.itemActiveBg
- sidebar.itemActiveText
- sidebar.border
- sidebar.profileBg

Apply theme variables to every section:

1. Sidebar
- Background must use sidebar.bg
- Menu text must use sidebar.text
- Inactive icons must use sidebar.icon
- Active menu background must use sidebar.itemActiveBg
- Active menu text must use sidebar.itemActiveText
- Active icon must use sidebar.iconActive
- Hover state must use sidebar.itemHoverBg
- Divider line must use sidebar.border
- Bottom user profile area must use sidebar.profileBg
- Collapse button must also use theme variables

2. Main Dashboard
- Page background must use bg.app
- Cards must use bg.surface
- Card borders must use border.default
- Card headings must use text.primary
- Secondary labels must use text.secondary
- Muted labels must use text.muted

3. Header / Topbar
- Background must use bg.surface
- Text and icons must use theme text/icon variables
- Border must use border.default

4. Tables
- Table background must use bg.surface
- Header background must use bg.surfaceAlt
- Row borders must use border.default
- Text must use text.primary and text.secondary
- Hover state must use accent.soft

5. Forms
- Input background must use bg.surfaceAlt
- Input border must use border.default
- Input focus border must use accent.primary
- Placeholder must use text.muted
- Label must use text.secondary

6. Buttons
- Primary button background must use accent.primary
- Primary button text must use text.inverse
- Secondary button background must use accent.soft
- Secondary button text must use accent.primary
- Hover state must use accent.hover
- Disabled state must use text.muted and bg.surfaceAlt

7. Modals and Dropdowns
- Modal background must use bg.modal
- Dropdown background must use bg.dropdown
- Border must use border.default
- Active selection must use accent.active
- Selected label must use accent.primary
- Scrollbar must match the theme

8. Charts
- Chart background must use bg.surface
- Grid lines must use chart.grid
- Axis labels must use chart.axis
- Completed line must use chart.success
- Failed line must use chart.error
- Bar chart must use chart.primary
- Pie chart must use chart.primary, chart.secondary, chart.warning, chart.error

Theme palette definitions:

Light:
- bg.app: #F8FAFC
- bg.sidebar: #FFFFFF
- bg.surface: #FFFFFF
- bg.surfaceAlt: #F1F5F9
- text.primary: #0F172A
- text.secondary: #475569
- text.muted: #94A3B8
- border.default: #E2E8F0
- accent.primary: #2563EB
- accent.soft: #DBEAFE
- accent.hover: #1D4ED8

Dark Core:
- bg.app: #0F172A
- bg.sidebar: #111827
- bg.surface: #1E293B
- bg.surfaceAlt: #273449
- text.primary: #F8FAFC
- text.secondary: #CBD5E1
- text.muted: #94A3B8
- border.default: #334155
- accent.primary: #3B82F6
- accent.soft: #1E3A5F
- accent.hover: #60A5FA

Soft Pastel:
- bg.app: #FFF7ED
- bg.sidebar: #FFF1F2
- bg.surface: #FFFFFF
- bg.surfaceAlt: #FEF3C7
- text.primary: #3B2F2F
- text.secondary: #7C5C5C
- text.muted: #A78B8B
- border.default: #FAD7C5
- accent.primary: #EC4899
- accent.soft: #FCE7F3
- accent.hover: #DB2777

High Contrast:
- bg.app: #000000
- bg.sidebar: #0A0A0A
- bg.surface: #111111
- bg.surfaceAlt: #1A1A1A
- text.primary: #FFFFFF
- text.secondary: #E5E7EB
- text.muted: #A3A3A3
- border.default: #404040
- accent.primary: #FACC15
- accent.soft: #3A3000
- accent.hover: #FDE047

Indigo Pulse:
- bg.app: #0F172A
- bg.sidebar: #111827
- bg.surface: #1E293B
- bg.surfaceAlt: #273449
- text.primary: #EEF2FF
- text.secondary: #C7D2FE
- text.muted: #818CF8
- border.default: #3730A3
- accent.primary: #6366F1
- accent.soft: #312E81
- accent.hover: #818CF8

Sales Ignite:
- bg.app: #1C1917
- bg.sidebar: #211A16
- bg.surface: #292524
- bg.surfaceAlt: #3A2A20
- text.primary: #FFF7ED
- text.secondary: #FDBA74
- text.muted: #A8A29E
- border.default: #7C2D12
- accent.primary: #F97316
- accent.soft: #431407
- accent.hover: #FB923C

Growth Analytics:
- bg.app: #102014
- bg.sidebar: #12251A
- bg.surface: #1A2E22
- bg.surfaceAlt: #223A2A
- text.primary: #F0FDF4
- text.secondary: #BBF7D0
- text.muted: #86EFAC
- border.default: #166534
- accent.primary: #22C55E
- accent.secondary: #FACC15
- accent.soft: #14532D
- accent.hover: #4ADE80

Enterprise Slate:
- bg.app: #111827
- bg.sidebar: #0F172A
- bg.surface: #1F2937
- bg.surfaceAlt: #273549
- text.primary: #F9FAFB
- text.secondary: #CBD5E1
- text.muted: #94A3B8
- border.default: #475569
- accent.primary: #38BDF8
- accent.soft: #082F49
- accent.hover: #7DD3FC

Realty Premium:
- bg.app: #0F1F1A
- bg.sidebar: #10251D
- bg.surface: #18352A
- bg.surfaceAlt: #214536
- text.primary: #FFF7ED
- text.secondary: #D6B56D
- text.muted: #A3A38A
- border.default: #5A4A24
- accent.primary: #D4AF37
- accent.soft: #3B3218
- accent.hover: #EACB66

Urban Blue:
- bg.app: #0F172A
- bg.sidebar: #102033
- bg.surface: #1E3A5F
- bg.surfaceAlt: #24476F
- text.primary: #F8FAFC
- text.secondary: #BFDBFE
- text.muted: #93C5FD
- border.default: #2563EB
- accent.primary: #0EA5E9
- accent.soft: #075985
- accent.hover: #38BDF8

AI Neon:
- bg.app: #080A1A
- bg.sidebar: #0D1025
- bg.surface: #111633
- bg.surfaceAlt: #171D40
- text.primary: #F8FAFC
- text.secondary: #C4B5FD
- text.muted: #8B5CF6
- border.default: #4C1D95
- accent.primary: #A855F7
- accent.secondary: #22D3EE
- accent.soft: #2E1065
- accent.hover: #C084FC

Important implementation rules:
- Replace every hardcoded fill, stroke, text, icon, border, shadow, and chart color with variables.
- Sidebar must update immediately when theme changes.
- Theme dropdown itself must also follow the selected theme.
- Active theme preview card should use accent.primary and accent.soft.
- Accent color selector should override only accent.primary and related accent states, not the full theme base.
- Do not use pure black except High Contrast.
- Maintain readable contrast in all themes.
- Keep the UI responsive and mobile-friendly.
- Test every theme on sidebar, cards, charts, forms, tables, modals, dropdowns, and bottom user profile area.