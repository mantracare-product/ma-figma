# Field Database & Value Storage Architecture

This document provides a comprehensive technical reference for how **custom fields** and **field values** are stored, structured, and managed across the system, with a detailed breakdown of the **New List (`new_list`)** field type and its three variants (**Basic List**, **Advanced List**, and **Advance 2**).

---

## 1. High-Level Architecture: Schema vs. Value Storage

The application maintains a strict separation between **Field Definitions (Schema / Metadata)** and **Field Values (Runtime Instance Data)**.

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          1. SCHEMA LAYER (ADMIN)                          │
│                                                                           │
│   FieldRegistryContext ──► localStorage["mantra_field_registry_v1"]      │
│   AdvanceListStore     ──► localStorage["mantra_advance_lists_v1"]       │
│   SectionRegistry      ──► localStorage["mantra_section_registry_v1"]    │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │ defines schema & rules
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                         2. RUNTIME VALUE LAYER (CLIENT)                   │
│                                                                           │
│   Entity Record (Client / Process / Appointment / Deal / Scribe)          │
│   └── fieldValues: Record<string, any>                                    │
│       ├── [fieldKey]: Primitive | Array | Object                          │
│       └── [sectionId_fieldKey]: Scoped field value override               │
└───────────────────────────────────────────────────────────────────────────┘
```

### Storage Mechanisms

| Layer | Primary In-Memory Store | Persistent Storage Key | Description |
| :--- | :--- | :--- | :--- |
| **Field Definitions** | `FieldRegistryContext` (`customFields`) | `mantra_field_registry_v1` | All field metadata, validation, options, scoping, and configuration per module. |
| **Advance Lists Datasets** | `advanceListStore` | `mantra_advance_lists_v1` | Central datasets with multi-column schemas and data rows for Advance List 2. |
| **Section Definitions** | `FieldRegistryContext` (`customSections`) | `mantra_section_registry_v1` | Custom and system section layouts, scoping rules, and permissions. |
| **Entity Record Values** | Component state (`fieldValues`, `recordData`) | Entity stores (`mantra_clients_v1`, `mantra_processes_v1`, etc.) | Key-value store holding the actual entered data for each entity instance. |

---

## 2. Field Value Keying Convention

When an entity record (e.g., Client Profile or Process Drawer) stores values, values are indexed in a dictionary object `Record<string, any>`:

1. **Unscoped / Direct Key**: `fieldValues[field.key]` (e.g. `fieldValues["primary_procedure"]`)
   - Used when a field belongs to standard record views or default sections.
2. **Section-Scoped Key**: `fieldValues[`${section.id}_${field.key}`]` (e.g. `fieldValues["sec_custom_101_primary_procedure"]`)
   - Used when sections require isolated state per section instance or when resolving hierarchical fallbacks.

---

## 3. Deep Dive: New List (`new_list`) Field Type

The **New List** (`inputType: "new_list"`) field type is a versatile selection engine that supports three distinct operating modes:
1. **Basic List (`manual` / `basic_list`)** — Direct option list with single/multi-selection and runtime additions.
2. **Advanced List (`option_list` / `advanced_list`)** — Dynamic extraction from upstream composite/table/open-list fields with column mapping and local overrides.
3. **Advance 2 (`advance_2`)** — Global multi-column datasets with primary keys, locked columns, and per-record column editing.

---

### Type 1: Basic List (`manual` / `basic_list`)

#### Overview
A self-contained list of options configured directly within the field definition. Options can have primitive values (string, number) or structured metadata, with support for search, sorting, and user-added custom options.

#### 1. Schema Storage (Field Definition)
Stored inside `localStorage["mantra_field_registry_v1"]` under `FieldDefinition`:

```json
{
  "id": 1727001001,
  "key": "consultation_type",
  "label": "Consultation Type",
  "module": "client",
  "source": "custom",
  "inputType": "new_list",
  "selectionMode": "single",
  "allowCustomOptions": true,
  "newListConfig": {
    "sourceMode": "manual",
    "manualType": "single",
    "selectionMode": "single",
    "allowSearch": true,
    "sortOrder": "alphabetical_asc",
    "allowCustomOptions": true,
    "defaultOptionId": "opt_1"
  },
  "options": [
    { "id": "opt_1", "label": "In-Person Consultation", "value": "In-Person Consultation", "isDefault": true },
    { "id": "opt_2", "label": "Video Telehealth", "value": "Video Telehealth", "isDefault": false },
    { "id": "opt_3", "label": "Phone Call", "value": "Phone Call", "isDefault": false }
  ]
}
```

#### 2. Runtime Field Value Storage

- **Single Selection Mode (`selectionMode: "single"`)**:
  Stored directly as a primitive string or value:
  ```json
  // fieldValues["consultation_type"]
  "Video Telehealth"
  ```

- **Multiple Selection Mode (`selectionMode: "multiple"`)**:
  Stored as an array of selected option strings / values:
  ```json
  // fieldValues["consultation_type"]
  [
    "In-Person Consultation",
    "Video Telehealth"
  ]
  ```

---

### Type 2: Advanced List (`option_list` / `advanced_list`)

#### Overview
Extracts its choices dynamically from an upstream **Open List**, **Table**, or **Composite** field on the same record or module. Administrators define column behaviors:
- **Primary Column**: Acts as the main display title / identifier.
- **Disabled Column (`isDisable: true`)**: Locked / read-only; inherits upstream values.
- **Editable Column (`isEditable: true`)**: Allows runtime users to override the cell value for that specific record.

#### 1. Schema Storage (Field Definition)
Stored in `localStorage["mantra_field_registry_v1"]`:

```json
{
  "id": 1727002002,
  "key": "selected_package_service",
  "label": "Selected Package Service",
  "module": "client",
  "source": "custom",
  "inputType": "new_list",
  "selectionMode": "single",
  "newListConfig": {
    "sourceMode": "option_list",
    "selectionMode": "single",
    "allowSearch": true,
    "optionList": {
      "sourceCompositeFieldKey": "custom_service_packages_table",
      "columns": [
        {
          "columnId": "service_name",
          "columnName": "Service Name",
          "columnType": "string",
          "isPrimary": true,
          "isDisable": false,
          "isEditable": false
        },
        {
          "columnId": "base_rate",
          "columnName": "Standard Rate ($)",
          "columnType": "number",
          "isPrimary": false,
          "isDisable": false,
          "isEditable": true
        },
        {
          "columnId": "service_code",
          "columnName": "Service Code",
          "columnType": "string",
          "isPrimary": false,
          "isDisable": true,
          "isEditable": false
        }
      ]
    }
  }
}
```

#### 2. Runtime Field Value Storage

Values store the selected item reference along with any **local column overrides** made on that specific record:

- **Single Selection with Overrides (`selectionMode: "single"`)**:
  ```json
  // fieldValues["selected_package_service"]
  {
    "selectedRowId": "row_pkg_101",
    "primaryValue": "Comprehensive Dental Cleaning",
    "values": {
      "service_name": "Comprehensive Dental Cleaning",
      "base_rate": 150,
      "service_code": "D1110"
    },
    "overrides": {
      "base_rate": 125
    }
  }
  ```
  *(In this example, the user edited the editable `base_rate` from 150 down to 125 for this client)*.

- **Multiple Selection Mode (`selectionMode: "multiple"`)**:
  ```json
  // fieldValues["selected_package_service"]
  [
    {
      "selectedRowId": "row_pkg_101",
      "primaryValue": "Comprehensive Dental Cleaning",
      "values": {
        "service_name": "Comprehensive Dental Cleaning",
        "base_rate": 150,
        "service_code": "D1110"
      },
      "overrides": {
        "base_rate": 125
      }
    },
    {
      "selectedRowId": "row_pkg_104",
      "primaryValue": "Fluoride Treatment",
      "values": {
        "service_name": "Fluoride Treatment",
        "base_rate": 45,
        "service_code": "D1208"
      },
      "overrides": {}
    }
  ]
  ```

---

### Type 3: Advance 2 (`advance_2`)

#### Overview
Links to a globally managed **Advance List Dataset** (from `advanceListStore`). Advance List 2 datasets act like relational tables with typed columns (`string`, `number`), CSV import/export, and column-level permission flags (`isPrimary`, `isEditable`, `isDisable`).

#### 1. Schema Storage

##### A. Global Dataset Definition (stored in `localStorage["mantra_advance_lists_v1"]`)
```json
{
  "id": "adv_list_procedures",
  "name": "Medical Procedures Catalog",
  "description": "Standard clinic procedures with unit rates and billing codes",
  "columns": [
    {
      "id": "col_procedure_name",
      "name": "Procedure Name",
      "type": "string",
      "isPrimary": true,
      "isEditable": false,
      "isDisable": false
    },
    {
      "id": "col_cpt_code",
      "name": "CPT / Billing Code",
      "type": "string",
      "isPrimary": false,
      "isEditable": false,
      "isDisable": true
    },
    {
      "id": "col_standard_fee",
      "name": "Standard Fee ($)",
      "type": "number",
      "isPrimary": false,
      "isEditable": true,
      "isDisable": false
    },
    {
      "id": "col_duration_mins",
      "name": "Duration (Minutes)",
      "type": "number",
      "isPrimary": false,
      "isEditable": false,
      "isDisable": false
    }
  ],
  "rows": [
    {
      "id": "row_1",
      "label": "Comprehensive Consultation",
      "isDefault": true,
      "values": {
        "col_procedure_name": "Comprehensive Consultation",
        "col_cpt_code": "99204",
        "col_standard_fee": 150,
        "col_duration_mins": 45
      }
    },
    {
      "id": "row_2",
      "label": "Follow-up Assessment",
      "isDefault": false,
      "values": {
        "col_procedure_name": "Follow-up Assessment",
        "col_cpt_code": "99213",
        "col_standard_fee": 85,
        "col_duration_mins": 20
      }
    }
  ]
}
```

##### B. Field Definition Linking to Dataset (in `localStorage["mantra_field_registry_v1"]`)
```json
{
  "id": 1727003003,
  "key": "procedure_performed",
  "label": "Procedure Performed",
  "module": "process",
  "source": "custom",
  "inputType": "new_list",
  "selectionMode": "single",
  "newListConfig": {
    "sourceMode": "advance_2",
    "advanceListId": "adv_list_procedures",
    "selectionMode": "single",
    "allowSearch": true,
    "allowCustomOptions": true
  }
}
```

#### 2. Runtime Field Value Storage

When a user selects a procedure on a client record or deal drawer, the field stores the selected catalog row ID, the primary label, the snapshot of default column values, and any per-record **overrides**:

- **Single Selection with Override (`selectionMode: "single"`)**:
  ```json
  // fieldValues["procedure_performed"]
  {
    "selectedRowId": "row_1",
    "primaryValue": "Comprehensive Consultation",
    "values": {
      "col_procedure_name": "Comprehensive Consultation",
      "col_cpt_code": "99204",
      "col_standard_fee": 150,
      "col_duration_mins": 45
    },
    "overrides": {
      "col_standard_fee": 175
    }
  }
  ```

- **Multiple Selection (`selectionMode: "multiple"`)**:
  ```json
  // fieldValues["procedure_performed"]
  [
    {
      "selectedRowId": "row_1",
      "primaryValue": "Comprehensive Consultation",
      "values": {
        "col_procedure_name": "Comprehensive Consultation",
        "col_cpt_code": "99204",
        "col_standard_fee": 150,
        "col_duration_mins": 45
      },
      "overrides": {
        "col_standard_fee": 175
      }
    },
    {
      "selectedRowId": "row_2",
      "primaryValue": "Follow-up Assessment",
      "values": {
        "col_procedure_name": "Follow-up Assessment",
        "col_cpt_code": "99213",
        "col_standard_fee": 85,
        "col_duration_mins": 20
      },
      "overrides": {}
    }
  ]
  ```

---

## 4. Summary Comparison Matrix: New List 3 Types

| Feature | Type 1: Basic List (`manual`) | Type 2: Advanced List (`option_list`) | Type 3: Advance 2 (`advance_2`) |
| :--- | :--- | :--- | :--- |
| **Source Mode** | `"manual"` / `"basic_list"` | `"option_list"` / `"advanced_list"` | `"advance_2"` |
| **Data Origin** | Hardcoded in `field.options` | Dynamically extracted from upstream Table / Open List | Centrally managed `AdvanceListDefinition` |
| **Structure** | Flat list of labels / values | Multi-column mapped to source field columns | Multi-column typed dataset (String / Number) |
| **Column Controls** | N/A | `isPrimary`, `isDisable`, `isEditable` | `isPrimary`, `isDisable`, `isEditable` |
| **Per-Record Overrides** | No | Yes (stored in `item.overrides[colId]`) | Yes (stored in `item.overrides[colId]`) |
| **Single Value Format** | `"Option A"` | `{ selectedRowId, primaryValue, values, overrides }` | `{ selectedRowId, primaryValue, values, overrides }` |
| **Multi Value Format** | `["Option A", "Option B"]` | `Array<{ selectedRowId, primaryValue, overrides }>` | `Array<{ selectedRowId, primaryValue, overrides }>` |
| **Use Cases** | Dropdown choices, status pickers, categories | Billing codes from a package table, dynamic line items | Procedure catalogs, price books, inventory items |
