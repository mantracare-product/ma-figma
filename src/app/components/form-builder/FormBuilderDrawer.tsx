import FormBuilder, { FormBuilderProps } from "../../pages/FormBuilder";

export default function FormBuilderDrawer(props: Omit<FormBuilderProps, "isDrawer">) {
  return <FormBuilder {...props} isDrawer={true} />;
}

