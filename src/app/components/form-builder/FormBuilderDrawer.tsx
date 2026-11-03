import React from "react";
import FormBuilder, { FormBuilderProps } from "../../pages/FormBuilder";

export default function FormBuilderDrawer(props: Omit<FormBuilderProps, "isDrawer">): React.ReactElement | null {
  return <FormBuilder {...props} isDrawer={true} />;
}

