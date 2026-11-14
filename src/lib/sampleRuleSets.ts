/**
 * Registers the sample rule sets (E, E2, C, M). Each later slice fills its set from its own file:
 *   Set E  (A1-A10, A13)  -> Slice 3 (S3.5)
 *   Set E2 (A11, A12)     -> Slice 6 (S6.3)
 *   Set C  (A14-A20)      -> Slice 4 (S4.6)
 *   Set M  (A21-A30)      -> Slice 5 (S5.4)
 * Until a slice contributes its rules, its set is simply not registered (no empty buttons in the UI).
 */
import "./rcmRulesSetE";
import "./rcmRulesSetC";

export {};
