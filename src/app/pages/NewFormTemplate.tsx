import { Plus } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/Button";

interface Template {
  id: number;
  name: string;
  fields: string[];
  buttonText: string;
  description: string;
  stats: string;
}

const templates: Template[] = [
  {
    id: 1,
    name: "Contact Form",
    fields: ["Name", "Email", "Phone", "Message"],
    buttonText: "Send Message",
    description:
      "Perfect for capturing general inquiries and customer questions. Includes all essential contact fields.",
    stats: "Used by 12.5K businesses",
  },
  {
    id: 2,
    name: "Appointment Booking",
    fields: ["Name", "Email", "Phone", "Preferred Date", "Time Slot"],
    buttonText: "Book Appointment",
    description:
      "Streamline scheduling with date and time selection. Great for service-based businesses.",
    stats: "Used by 8.2K businesses",
  },
  {
    id: 3,
    name: "Lead Generation",
    fields: ["Name", "Email", "Phone", "Company", "How can we help?"],
    buttonText: "Get Started",
    description:
      "Capture qualified leads with company information. Ideal for B2B sales teams.",
    stats: "Used by 15.8K businesses",
  },
  {
    id: 4,
    name: "Quote Request",
    fields: ["Name", "Email", "Phone", "Project Details", "Budget Range"],
    buttonText: "Request Quote",
    description:
      "Gather project requirements and budget info. Perfect for agencies and contractors.",
    stats: "Used by 6.4K businesses",
  },
  {
    id: 5,
    name: "Event Registration",
    fields: ["Name", "Email", "Phone", "Number of Attendees", "Dietary Requirements"],
    buttonText: "Register Now",
    description:
      "Simplify event sign-ups with attendee tracking. Great for conferences and workshops.",
    stats: "Used by 4.9K businesses",
  },
];

export default function NewFormTemplate() {
  const navigate = useNavigate();

  const handleCreateFromTemplate = (template: Template) => {
    navigate("/web-forms/builder", { state: { template } });
  };

  const handleStartFromScratch = () => {
    navigate("/web-forms/builder");
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ fontFamily: 'Outfit, sans-serif', color: '#94A3B8' }}>
            NEW FORM
          </p>
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'DM Sans, sans-serif', color: '#020817' }}>
            Start with a template
          </h2>
          <p className="text-sm" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
            Get started in minutes — or build your own from scratch.
          </p>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="border border-border rounded-xl p-5 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group"
              onClick={() => handleCreateFromTemplate(template)}
            >
              <h3 className="text-base font-bold mb-4" style={{ fontFamily: 'DM Sans, sans-serif', color: '#020817' }}>
                {template.name}
              </h3>

              {/* Form Preview */}
              <div className="space-y-2 mb-4">
                {template.fields.map((field, idx) => (
                  <input
                    key={idx}
                    type="text"
                    placeholder={field}
                    disabled
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded text-xs text-gray-400 cursor-pointer"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                ))}
                <button
                  disabled
                  className="w-full py-2.5 bg-black text-white rounded text-sm font-semibold cursor-pointer"
                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                >
                  {template.buttonText}
                </button>
              </div>

              {/* Description */}
              <p className="text-xs mb-3 leading-relaxed" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
                {template.description}
              </p>

              {/* Stats */}
              <p className="text-xs" style={{ fontFamily: 'Outfit, sans-serif', color: '#94A3B8' }}>
                {template.stats}
              </p>
            </div>
          ))}

          {/* Start from Scratch */}
          <div
            className="border-2 border-dashed border-border rounded-xl p-5 bg-white hover:bg-gray-50 transition-colors cursor-pointer group flex flex-col items-center justify-center min-h-[300px]"
            onClick={handleStartFromScratch}
          >
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4 group-hover:bg-gray-200 transition-colors">
              <Plus className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-base font-bold mb-2" style={{ fontFamily: 'DM Sans, sans-serif', color: '#020817' }}>
              Start from scratch
            </h3>
            <p className="text-xs text-center" style={{ fontFamily: 'Outfit, sans-serif', color: '#64748B' }}>
              Full creative control
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <p className="text-xs" style={{ fontFamily: 'Outfit, sans-serif', color: '#94A3B8' }}>
            All templates include Name, Email, and Phone by default.
          </p>
          <Button
            variant="outline"
            onClick={() => navigate("/web-forms")}
            className="text-sm"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
