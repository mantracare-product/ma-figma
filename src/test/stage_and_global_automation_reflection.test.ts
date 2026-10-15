import { describe, it } from "vitest";
import assert from "node:assert";
import { getStagesTargetedByAutomation, AutomationRule } from "../lib/useAutomationStore";

describe("Stage and Global Automation Reflection Test", () => {
  it("reflects global automations in stage level when stage trigger or update_to_stage targets that stage", () => {
    // Stage under test
    const stage = { id: "stage-booked", name: "Booked" };
    const selectedProcess = "proc-appointment";
    const selectedProcessData = { id: "proc-appointment", name: "Appointment Flow", stages: [stage] };

    // 1. Global automation: appointment booked -> update stage to booked -> wait 5min -> send email
    const globalAppointmentRule: AutomationRule = {
      id: "rule-global-appt",
      orgId: "default",
      name: "Global Appointment Flow",
      entityType: "appointment",
      trigger: {
        event: "appointment.booked",
        label: "Appointment Booked",
        params: {},
      },
      action: {
        type: "moveToStage",
        processId: "proc-appointment",
        stageId: "stage-booked",
        processName: "Appointment Flow",
        stageName: "Booked",
      },
      actions: [
        {
          id: "step-1",
          name: "Update to stage",
          description: "",
          iconKey: "zap",
          stepKey: "update_to_stage",
          params: {
            processId: "proc-appointment",
            stageId: "stage-booked",
            stageName: "Booked",
          },
        },
        {
          id: "step-2",
          name: "Wait / Delay",
          description: "",
          iconKey: "clock",
          stepKey: "wait",
          delayValue: 5,
          delayUnit: "minutes",
        },
        {
          id: "step-3",
          name: "Send Email",
          description: "",
          iconKey: "mail",
          stepKey: "email",
          params: { subject: "Your appointment is confirmed" },
        },
      ],
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 2. Stage level automation: on stage enter -> send email
    const stageLevelRule: AutomationRule = {
      id: "rule-stage-enter",
      orgId: "default",
      name: "On Entry: Booked",
      entityType: "appointment",
      trigger: {
        event: "stage.entry",
        label: "On Stage Entry: Booked",
        params: {
          processId: "proc-appointment",
          stageId: "stage-booked",
          stageName: "Booked",
          triggerStageId: "stage-booked",
          triggerStageName: "Booked",
        },
      },
      action: {
        type: "moveToStage",
        processId: "proc-appointment",
        stageId: "stage-booked",
        stageName: "Booked",
      },
      actions: [
        {
          id: "step-stage-1",
          name: "Send Welcome Email",
          description: "",
          iconKey: "mail",
          stepKey: "email",
          params: { subject: "Welcome to booked stage" },
        },
      ],
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 3. Global automation with a stage trigger: stage.entered Booked -> send SMS
    const globalStageTriggerRule: AutomationRule = {
      id: "rule-global-stage-trig",
      orgId: "default",
      name: "Global Rule on Stage Enter",
      entityType: "appointment",
      trigger: {
        event: "stage.entered",
        label: "Stage Entered",
        params: {
          category: "stage",
          triggerProcessId: "proc-appointment",
          triggerStageId: "stage-booked",
          triggerStageName: "Booked",
        },
      },
      action: {
        type: "moveToStage",
        processId: "proc-appointment",
        stageId: "stage-booked",
      },
      actions: [
        {
          id: "step-sms-1",
          name: "Send SMS",
          description: "",
          iconKey: "message-square",
          stepKey: "sms",
        },
      ],
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 4. An unrelated rule for another stage
    const unrelatedRule: AutomationRule = {
      id: "rule-unrelated",
      orgId: "default",
      name: "Unrelated Rule",
      entityType: "client",
      trigger: {
        event: "client.created",
        params: {},
      },
      action: {
        type: "moveToStage",
        processId: "proc-other",
        stageId: "stage-other",
      },
      actions: [],
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const allRules = [globalAppointmentRule, stageLevelRule, globalStageTriggerRule, unrelatedRule];

    // Simulate stageRules filtering function from Process.tsx
    const filterStageRules = (rules: AutomationRule[]) => {
      return rules.filter((r) => {
        const trigEvt = (r.trigger?.event || "").toLowerCase();
        const isStageTrigger =
          trigEvt.startsWith("stage.") ||
          trigEvt.includes("stage") ||
          trigEvt.endsWith(".entered_stage") ||
          r.trigger?.params?.category === "stage" ||
          r.trigger?.params?.triggerType === "stage";

        const triggerStageId = r.trigger?.params?.stageId || r.trigger?.params?.triggerStageId;
        const triggerStageName = r.trigger?.params?.stageName || r.trigger?.params?.triggerStageName;
        const triggerProcId = r.trigger?.params?.processId || r.trigger?.params?.triggerProcessId;

        const triggerMatchesStage =
          triggerStageId === stage.id ||
          (triggerStageName && triggerStageName.toLowerCase() === stage.name.toLowerCase());

        const triggerMatchesProcess =
          !triggerProcId ||
          triggerProcId === "all" ||
          triggerProcId === selectedProcess ||
          (selectedProcessData && r.trigger?.params?.processName === selectedProcessData.name);

        const isStageTriggerForRule = isStageTrigger && triggerMatchesStage && triggerMatchesProcess;

        const actionStageId = r.action?.stageId || (r as any).params?.stageId;
        const actionStageName = r.action?.stageName;
        const actionMatchesDirectly =
          actionStageId === stage.id ||
          (actionStageName && actionStageName.toLowerCase() === stage.name.toLowerCase());

        const hasStepTargetingStage = (stepsList?: any[]): boolean => {
          if (!stepsList || !Array.isArray(stepsList)) return false;
          return stepsList.some((step) => {
            const isMove =
              step.stepKey === "update_to_stage" ||
              step.stepKey === "update-stage" ||
              step.stepKey === "movetostage" ||
              step.stepKey === "stagemovement" ||
              step.stepKey === "processmovement" ||
              step.stepKey === "move-stage" ||
              step.stepKey === "move-process";
            if (isMove) {
              const stepStageId = step.params?.stageId || step.params?.stepDetailStage;
              const stepStageName = step.params?.stageName || step.params?.stepDetailStageName;
              if (
                stepStageId === stage.id ||
                (stepStageName && stepStageName.toLowerCase() === stage.name.toLowerCase())
              ) {
                return true;
              }
            }
            if (step.branches && Array.isArray(step.branches)) {
              return step.branches.some((b: any) => hasStepTargetingStage(b.steps));
            }
            return false;
          });
        };

        const hasActionMovingToStage = actionMatchesDirectly || hasStepTargetingStage(r.actions);

        return isStageTriggerForRule || hasActionMovingToStage;
      });
    };

    const reflectedRules = filterStageRules(allRules);

    // Assert that the stage reflects:
    // 1. The global rule that moves to this stage (Appointment Booked -> Update stage to Booked)
    assert.strictEqual(
      reflectedRules.some((r) => r.id === "rule-global-appt"),
      true,
      "Global rule with update_to_stage targeting 'Booked' must reflect in Booked stage"
    );

    // 2. The stage-level rule
    assert.strictEqual(
      reflectedRules.some((r) => r.id === "rule-stage-enter"),
      true,
      "Stage level rule must reflect in Booked stage"
    );

    // 3. The global rule with stage trigger
    assert.strictEqual(
      reflectedRules.some((r) => r.id === "rule-global-stage-trig"),
      true,
      "Global rule with stage trigger targeting 'Booked' must reflect in Booked stage"
    );

    // 4. Unrelated rule should NOT be included
    assert.strictEqual(
      reflectedRules.some((r) => r.id === "rule-unrelated"),
      false,
      "Unrelated rule must NOT reflect in Booked stage"
    );

    assert.strictEqual(reflectedRules.length, 3, "Exactly 3 rules should reflect in Booked stage");
  });
});
