Fix the Processes tab in the Client Profile Drawer (document 5, inside the `<Drawer>` component for `showProfileDrawer`) and fix stage color updates on click.

## ISSUE 1: Processes Tab Layout must match Overview Tab layout

The Processes tab currently shows fields with inline label+value in a cramped way with no clear structure. Replace the entire Processes tab content with the EXACT same field layout pattern used in the Overview tab of the same drawer.

The Overview tab uses this pattern for each field:
```jsx
<div className="flex flex-col gap-1.5">
  <label className="text-xs uppercase font-semibold" style={{ color: '#9CA3AF', fontFamily: 'Outfit, sans-serif', letterSpacing: '0.05em' }}>
    FIELD NAME
  </label>
  <input ... style={{ backgroundColor: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: '6px', color: '#1F2937', fontFamily: 'Outfit, sans-serif' }} />
</div>
```

Apply this EXACT same field card structure to the Processes tab. Each process should be wrapped in:
```jsx
<div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
  <div className="p-5 space-y-4">
    {/* process name header */}
    {/* fields below */}
  </div>
</div>
```

Fields to show per process card, each using `flex flex-col gap-1.5` with the uppercase gray label + styled input/select/value:

**STAGE field:**
```jsx
<div className="flex flex-col gap-1.5">
  <label className="text-xs uppercase font-semibold" style={{ color: '#9CA3AF', fontFamily: 'Outfit, sans-serif', letterSpacing: '0.05em' }}>STAGE</label>
  <div className="flex items-center gap-3">
    {/* stage block buttons row */}
    {/* stage name text */}
  </div>
</div>
```

**STATUS field:**
```jsx
<div className="flex flex-col gap-1.5">
  <label ...>STATUS</label>
  <div className="relative inline-block">
    <button className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ...">
      {processStatus[processId]} <ChevronDown />
    </button>
    {/* dropdown */}
  </div>
</div>
```

**CREATED field:**
```jsx
<div className="flex flex-col gap-1.5">
  <label ...>CREATED</label>
  <input type="datetime-local" ... style={{ backgroundColor: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: '6px', ... }} />
</div>
```

**RESPONSIBLE field:**
```jsx
<div className="flex flex-col gap-1.5">
  <label ...>RESPONSIBLE</label>
  <div className="relative inline-block">
    <button className="text-sm text-foreground hover:text-primary flex items-center gap-1.5">
      {responsible} <ChevronDown />
    </button>
    {/* dropdown */}
  </div>
</div>
```

**LAST ACTIVITY field:**
```jsx
<div className="flex flex-col gap-1.5">
  <label ...>LAST ACTIVITY</label>
  <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
    {/* grid of date/time, created by, event type, description */}
  </div>
</div>
```

Add dividers between fields: add `className="border-t border-border pt-4"` on each field wrapper except the first one.

Also add at the bottom of the process card, after the last field:
```jsx
<div className="border-t border-border pt-4 mt-2 flex items-center gap-4">
  <button style={{ color: '#4F8EF7', borderBottom: '1px dashed #4F8EF7', fontFamily: 'Outfit, sans-serif', fontSize: '14px', paddingBottom: '2px' }}>Select field</button>
  <button style={{ color: '#4F8EF7', borderBottom: '1px dashed #4F8EF7', fontFamily: 'Outfit, sans-serif', fontSize: '14px', paddingBottom: '2px' }}>Create field</button>
</div>
```

## ISSUE 2: Stage blocks must update color on click

Currently the stage blocks show color based on `selectedProcess.currentStage` which is derived from mock data and never updates when clicked.

**Fix:**

1. Add a new state at the top of the component (near other drawer states):
```jsx
const [drawerProcessStages, setDrawerProcessStages] = useState<Record<string, string>>({});
```

2. Initialize it when the drawer opens (in the `onClick` that sets `setShowProfileDrawer(true)`):
```jsx
// Initialize drawerProcessStages from drawerClientProcesses
```

3. In the stage blocks rendering inside the Processes tab, replace `selectedProcess.currentStage` with:
```jsx
const currentStage = drawerProcessStages[selectedProcess.id] || selectedProcess.currentStage;
```

4. On each stage block's `onClick`, update the state:
```jsx
onClick={() => {
  setDrawerProcessStages(prev => ({ ...prev, [selectedProcess.id]: stage.label }));
  toast.success(`Stage updated to ${stage.label}`);
}}
```

5. Also update the stage label text shown next to the blocks to use `currentStage` from state.

6. The stage block fill condition must use the new `currentStage` variable:
```jsx
const currentIndex = process.stages.findIndex(s => s.label === currentStage);
const isFilled = index <= currentIndex;
// isFilled → backgroundColor: '#0EA5E9'  (blue)
// !isFilled → backgroundColor: '#E5E7EB' (gray)
```

Apply these changes to document 5 (Clients.tsx) only, in the `activeProfileTab === "processes"` section of the Client Profile Drawer.