import { ChatbotFlowNode } from "../app/components/chats/ChatbotFlowBuilder";
import { ChannelType } from "../app/components/chats/ChatbotTab";

export interface LibraryBot {
  id: string;
  name: string;
  description: string;
  channels: ChannelType[];
  flow: {
    nodes: ChatbotFlowNode[];
  };
}

export function cloneLibraryBotNodes(nodes: ChatbotFlowNode[]): ChatbotFlowNode[] {
  const idMap = new Map<string, string>();

  // 1. Generate new IDs for all nodes
  nodes.forEach(node => {
    const newId = `node-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    idMap.set(node.id, newId);
  });

  // 2. Deep clone nodes and remap all connection references
  return nodes.map(node => {
    const newId = idMap.get(node.id) || node.id;
    const clonedConnections = (node.connections || []).map(conn => ({
      ...conn,
      toNodeId: idMap.get(conn.toNodeId) || conn.toNodeId,
    }));

    const clonedData = JSON.parse(JSON.stringify(node.data || {}));

    return {
      id: newId,
      type: node.type,
      position: { ...node.position },
      data: clonedData,
      connections: clonedConnections,
    };
  });
}

export const LIBRARY_BOTS: LibraryBot[] = [
  {
    id: "lib-bot-appointment-booking",
    name: "Appointment Booking Bot",
    description: "Automated multi-step flow that greets contacts, asks for their desired medical service and preferred date, and assigns the request to the front desk.",
    channels: ["whatsapp", "website"],
    flow: {
      nodes: [
        {
          id: "entry_node",
          type: "entryRouter",
          position: { x: 80, y: 150 },
          data: { label: "Inbound Message Router", direction: "inbound" },
          connections: [{ toNodeId: "node_greet" }]
        },
        {
          id: "node_greet",
          type: "message",
          position: { x: 380, y: 150 },
          data: {
            label: "Greeting Message",
            messageType: "text",
            messageText: "Hello! Welcome to our clinic. 🩺 I can help you schedule an appointment in under 2 minutes."
          },
          connections: [{ toNodeId: "node_ask_service" }]
        },
        {
          id: "node_ask_service",
          type: "question",
          position: { x: 680, y: 150 },
          data: {
            label: "Select Service",
            questionText: "Which service would you like to book today?",
            buttons: [
              { id: "b1", label: "General Consultation", value: "General Consultation" },
              { id: "b2", label: "Dental Examination", value: "Dental Examination" },
              { id: "b3", label: "Specialist Visit", value: "Specialist Visit" }
            ]
          },
          connections: [{ toNodeId: "node_ask_date" }]
        },
        {
          id: "node_ask_date",
          type: "question",
          position: { x: 980, y: 150 },
          data: {
            label: "Ask Date & Time",
            questionText: "Please type your preferred date (e.g. Tomorrow 10 AM or Friday 3 PM):",
            buttons: []
          },
          connections: [{ toNodeId: "node_assign" }]
        },
        {
          id: "node_assign",
          type: "assignHuman",
          position: { x: 1280, y: 150 },
          data: {
            label: "Assign to Desk",
            assigneeId: "unassigned",
            confirmationText: "Thank you! I have forwarded your appointment request to our scheduling team. Someone will confirm your slot shortly."
          },
          connections: []
        }
      ]
    }
  },
  {
    id: "lib-bot-faq-support",
    name: "FAQ & Support Bot",
    description: "Self-service customer support bot that answers common questions regarding clinic hours, location, services, and offers live human handoff.",
    channels: ["whatsapp", "website"],
    flow: {
      nodes: [
        {
          id: "entry_node",
          type: "entryRouter",
          position: { x: 80, y: 180 },
          data: { label: "Inbound Message Router", direction: "inbound" },
          connections: [{ toNodeId: "node_menu" }]
        },
        {
          id: "node_menu",
          type: "question",
          position: { x: 380, y: 180 },
          data: {
            label: "Main Support Menu",
            questionText: "Hi there! How can we assist you today? Please choose an option below:",
            buttons: [
              { id: "b1", label: "Hours & Location 📍", value: "Hours & Location" },
              { id: "b2", label: "Services & Costs 💳", value: "Services & Costs" },
              { id: "b3", label: "Talk to Human 👤", value: "Talk to Human" }
            ]
          },
          connections: [{ toNodeId: "node_route_menu" }]
        },
        {
          id: "node_route_menu",
          type: "condition",
          position: { x: 680, y: 180 },
          data: {
            label: "Check Choice",
            conditions: [
              { id: "c1", operator: "equals", value: "Hours & Location" },
              { id: "c2", operator: "equals", value: "Services & Costs" }
            ]
          },
          connections: [{ toNodeId: "node_info_hours", fromPort: "c1" }, { toNodeId: "node_info_services", fromPort: "c2" }, { toNodeId: "node_human_handoff", fromPort: "default" }]
        },
        {
          id: "node_info_hours",
          type: "message",
          position: { x: 980, y: 80 },
          data: {
            label: "Hours & Location Info",
            messageType: "text",
            messageText: "📍 Clinic Location: 123 Health Ave, Suite 400\n🕒 Hours: Monday - Friday 8:00 AM - 8:00 PM | Saturday 9:00 AM - 5:00 PM."
          },
          connections: []
        },
        {
          id: "node_info_services",
          type: "message",
          position: { x: 980, y: 220 },
          data: {
            label: "Services Info",
            messageType: "text",
            messageText: "💳 We offer Primary Care, Dental, Pediatrics, and Diagnostic Labs. For detailed pricing, visit our portal or reply 'Talk to Human'."
          },
          connections: []
        },
        {
          id: "node_human_handoff",
          type: "humanHandoff",
          position: { x: 980, y: 360 },
          data: {
            label: "Transfer to Support",
            handoffText: "Connecting you with a live patient care representative now. Please hold on..."
          },
          connections: []
        }
      ]
    }
  },
  {
    id: "lib-bot-lead-qualification",
    name: "Lead Qualification Bot",
    description: "Qualifies new inquiries, collects key contact details, sets custom lead tags, and routes hot prospects to sales or intake agents.",
    channels: ["whatsapp", "website"],
    flow: {
      nodes: [
        {
          id: "entry_node",
          type: "entryRouter",
          position: { x: 80, y: 160 },
          data: { label: "Inbound Router", direction: "inbound" },
          connections: [{ toNodeId: "node_welcome" }]
        },
        {
          id: "node_welcome",
          type: "message",
          position: { x: 380, y: 160 },
          data: {
            label: "Welcome Lead",
            messageType: "text",
            messageText: "Hi! Thanks for reaching out. We'd love to understand your requirements so we can match you with the right specialist."
          },
          connections: [{ toNodeId: "node_ask_goal" }]
        },
        {
          id: "node_ask_goal",
          type: "question",
          position: { x: 680, y: 160 },
          data: {
            label: "Primary Goal Question",
            questionText: "What is your main health or treatment goal?",
            buttons: [
              { id: "b1", label: "Preventive & Wellness", value: "Wellness" },
              { id: "b2", label: "Specialist Treatment", value: "Specialist" },
              { id: "b3", label: "Immediate Care", value: "Immediate" }
            ]
          },
          connections: [{ toNodeId: "node_field_update" }]
        },
        {
          id: "node_field_update",
          type: "fieldUpdate",
          position: { x: 980, y: 160 },
          data: {
            label: "Save Lead Source",
            fieldName: "Lead Source",
            fieldValue: "WhatsApp Bot"
          },
          connections: [{ toNodeId: "node_set_tags" }]
        },
        {
          id: "node_set_tags",
          type: "setTags",
          position: { x: 1280, y: 160 },
          data: {
            label: "Tag Qualified Prospect",
            tags: ["Qualified Lead", "WhatsApp Prospect"]
          },
          connections: [{ toNodeId: "node_assign_agent" }]
        },
        {
          id: "node_assign_agent",
          type: "assignHuman",
          position: { x: 1580, y: 160 },
          data: {
            label: "Route to Intake",
            assigneeId: "unassigned",
            confirmationText: "Perfect! An intake specialist has been assigned to your chat and will message you shortly."
          },
          connections: []
        }
      ]
    }
  }
];
