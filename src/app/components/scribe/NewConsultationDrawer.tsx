import React from "react";
import AIScribePopup, { AIScribePopupProps, SCRIBE_ENTITIES } from "./AIScribePopup";
import { EntityType } from "../../../lib/useProcessStore";

export type NewConsultationDrawerProps = AIScribePopupProps;
export interface ScribeEntityOption {
  id: EntityType;
  label: string;
  description?: string;
  prefix: string;
  icon: any;
}
export { SCRIBE_ENTITIES };

/**
 * Modern Slim, Draggable AI Scribe Popup Component
 * Allows physician to record/dictate first, then assign patient & metadata on saving.
 */
export default function NewConsultationDrawer(props: AIScribePopupProps) {
  return <AIScribePopup {...props} />;
}
