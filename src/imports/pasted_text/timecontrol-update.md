Looking at the image and code, I need to update the Time Control workflow step's "Time Intervals" section. Here's the precise update needed:

**Changes to make in the `timecontrol` step section (inside `stepDetailDrawerOpen`):**

1. Rename "Time Intervals" toggle label → **"Call Duration"**
2. Replace the time interval rows (start/end time + phone number) with:
   - **Call Duration** field (number input, in minutes)
   - **Hangup Window** field (dropdown: "Last X minute(s)") with validation that hangup window < call duration
   - Info tooltip explaining the logic

Find the Time Intervals section in the `timecontrol` step and replace it:Here's the exact prompt to make this update in the code:

---

**Prompt for the developer / AI coding assistant:**

In the `Process.tsx` file, inside the `timecontrol` step section (within `stepDetailDrawerOpen`), find **Section A — Time Intervals** and make the following changes:

1. **Rename the toggle label** from `"Time Intervals"` → `"Call Duration"`

2. **Add two new state variables** near the other `tc*` states:
```tsx
const [tcCallDurationMinutes, setTcCallDurationMinutes] = useState<number>(5);
const [tcHangupWindowMinutes, setTcHangupWindowMinutes] = useState<number>(1);
```

3. **Also add them to `resetStepDetailState()`**:
```tsx
setTcCallDurationMinutes(5);
setTcHangupWindowMinutes(1);
```

4. **Replace the entire expanded content block** of the Time Intervals section (the part rendered when `tcTimeIntervalsEnabled` is true — containing the `+ Add Interval` button, the interval rows with Start Time / End Time / phone number inputs, and the Save button) with:

```tsx
{tcTimeIntervalsEnabled && (
  <div className="border-t border-border p-4 space-y-4">
    {/* Call Duration */}
    <div>
      <div className="flex items-center gap-2 mb-1">
        <label className="text-sm font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
          Call Duration (minutes)
        </label>
        <Tooltip text="The maximum total duration of the call in minutes. The AI will attempt to wrap up the conversation before this limit is reached." placement="top">
          <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
        </Tooltip>
      </div>
      <input
        type="number"
        min={1}
        value={tcCallDurationMinutes}
        onChange={e => {
          const val = parseInt(e.target.value) || 1;
          setTcCallDurationMinutes(val);
          // ensure hangup window stays valid
          if (tcHangupWindowMinutes >= val) {
            setTcHangupWindowMinutes(val - 1 > 0 ? val - 1 : 1);
          }
        }}
        className="w-full px-3 py-2.5 text-sm rounded-md border border-border bg-white outline-none focus:border-blue-500 transition-colors"
        style={{ fontFamily: 'Outfit, sans-serif' }}
      />
    </div>

    {/* Hangup Window */}
    <div>
      <div className="flex items-center gap-2 mb-1">
        <label className="text-sm font-semibold" style={{ color: '#020817', fontFamily: 'DM Sans, sans-serif' }}>
          Hangup Window
        </label>
        <Tooltip text="During the last X minutes of the total call duration, the AI will proactively try to wrap up the conversation and end the call gracefully. The hangup window must be less than the total call duration." placement="top">
          <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
        </Tooltip>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground whitespace-nowrap" style={{ fontFamily: 'Outfit, sans-serif' }}>Last</span>
        <input
          type="number"
          min={1}
          max={tcCallDurationMinutes - 1}
          value={tcHangupWindowMinutes}
          onChange={e => {
            const val = parseInt(e.target.value) || 1;
            if (val >= tcCallDurationMinutes) {
              toast.error(`Hangup window must be less than the call duration (${tcCallDurationMinutes} min)`);
              return;
            }
            setTcHangupWindowMinutes(val);
          }}
          className="w-24 px-3 py-2.5 text-sm rounded-md border border-border bg-white outline-none focus:border-blue-500 transition-colors"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        />
        <span className="text-sm text-muted-foreground whitespace-nowrap" style={{ fontFamily: 'Outfit, sans-serif' }}>
          {tcHangupWindowMinutes === 1 ? 'minute' : 'minutes'}
        </span>
      </div>
      {tcHangupWindowMinutes >= tcCallDurationMinutes && (
        <p className="text-xs text-red-500 mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Hangup window must be less than call duration ({tcCallDurationMinutes} min).
        </p>
      )}
      <p className="text-xs mt-2" style={{ color: '#94A3B8', fontFamily: 'Outfit, sans-serif' }}>
        The AI will begin wrapping up the call during the last {tcHangupWindowMinutes} {tcHangupWindowMinutes === 1 ? 'minute' : 'minutes'} of a {tcCallDurationMinutes}-minute call.
      </p>
    </div>

    <div className="flex justify-end">
      <button
        onClick={() => toast.success("Call duration settings saved")}
        className="text-xs font-semibold px-3 py-1.5 rounded-md text-white"
        style={{ backgroundColor: '#2563EB', fontFamily: 'DM Sans, sans-serif' }}
      >
        Save
      </button>
    </div>
  </div>
)}
```

5. **Also remove** the now-unused states `tcTimeIntervals` and `setTcTimeIntervals` if they are only used inside Section A (keep them if used elsewhere).