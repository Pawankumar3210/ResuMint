"use client";

import { useResume } from "@/hooks/use-resume";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { CollapsibleReveal } from "@/components/ui/collapsible-reveal";

const DEFAULT_DECLARATION =
  "I hereby declare that the information provided above is true to the best of my knowledge.";

export function DeclarationSection() {
  const { resume, updateDeclaration } = useResume();
  const { enabled, text, place, date, showPlace, showDate, showSignature, showSignatureName, signatureName } =
    resume.declaration;

  return (
    <div className="flex flex-col gap-4">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground transition-colors hover:text-primary">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) =>
            updateDeclaration({
              enabled: e.target.checked,
              text: e.target.checked && !text ? DEFAULT_DECLARATION : text,
            })
          }
          className="h-4 w-4 rounded accent-primary transition-transform"
        />
        Include a declaration on my resume
      </label>

      <CollapsibleReveal show={enabled}>
        <Textarea
          label="Declaration Text"
          value={text}
          onChange={(e) => updateDeclaration({ text: e.target.value })}
          rows={3}
        />

        <div className="flex flex-col gap-3 rounded-input border border-glass-border p-3.5 transition-colors">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground transition-colors hover:text-primary">
            <input
              type="checkbox"
              checked={showPlace}
              onChange={(e) => updateDeclaration({ showPlace: e.target.checked })}
              className="h-4 w-4 rounded accent-primary transition-transform"
            />
            Include Place
          </label>
          <CollapsibleReveal show={showPlace} gap="gap-3">
            <Input
              label="Place"
              value={place}
              onChange={(e) => updateDeclaration({ place: e.target.value })}
              placeholder="Bengaluru"
            />
          </CollapsibleReveal>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground transition-colors hover:text-primary">
            <input
              type="checkbox"
              checked={showDate}
              onChange={(e) => updateDeclaration({ showDate: e.target.checked })}
              className="h-4 w-4 rounded accent-primary transition-transform"
            />
            Include Date
          </label>
          <CollapsibleReveal show={showDate} gap="gap-3">
            <Input
              label="Date"
              value={date}
              onChange={(e) => updateDeclaration({ date: e.target.value })}
              placeholder="May 20, 2025"
            />
          </CollapsibleReveal>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground transition-colors hover:text-primary">
            <input
              type="checkbox"
              checked={showSignature}
              onChange={(e) => updateDeclaration({ showSignature: e.target.checked })}
              className="h-4 w-4 rounded accent-primary transition-transform"
            />
            Include Signature line
          </label>
          <CollapsibleReveal show={showSignature} gap="gap-3">
            <div className="ml-6 flex flex-col gap-3 border-l border-glass-border pl-3.5">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground transition-colors hover:text-primary">
                <input
                  type="checkbox"
                  checked={showSignatureName}
                  onChange={(e) => updateDeclaration({ showSignatureName: e.target.checked })}
                  className="h-4 w-4 rounded accent-primary transition-transform"
                />
                Add my name as signature
              </label>
              <CollapsibleReveal show={showSignatureName} gap="gap-3">
                <Input
                  label="Signature Name"
                  value={signatureName}
                  onChange={(e) => updateDeclaration({ signatureName: e.target.value })}
                  placeholder="Your Full Name"
                />
              </CollapsibleReveal>
            </div>
          </CollapsibleReveal>
        </div>
      </CollapsibleReveal>
    </div>
  );
}
