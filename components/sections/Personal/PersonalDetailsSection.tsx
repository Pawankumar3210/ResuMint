"use client";

import { useResume } from "@/hooks/use-resume";
import { Input } from "@/components/ui/input";
import {
  isValidEmail,
  isValidPhone,
  isValidUrl,
  normalizeProfileUrl,
  cleanWhitespace,
  normalizeEmail,
} from "@/utils/resumeValidation";

export function PersonalDetailsSection() {
  const { resume, updatePersonal } = useResume();
  const p = resume.personal;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Input
        label="Full Name"
        value={p.fullName}
        onChange={(e) => updatePersonal({ fullName: e.target.value })}
        onBlur={() => updatePersonal({ fullName: cleanWhitespace(p.fullName) })}
        placeholder="Aarav Mehta"
        autoComplete="name"
      />
      <Input
        label="Email"
        type="email"
        value={p.email}
        onChange={(e) => updatePersonal({ email: e.target.value })}
        onBlur={() => updatePersonal({ email: normalizeEmail(p.email) })}
        placeholder="aarav.mehta@email.com"
        error={p.email && !isValidEmail(p.email) ? "Enter a valid email address." : undefined}
        autoComplete="email"
      />
      <Input
        label="Phone Number"
        value={p.phone}
        onChange={(e) => updatePersonal({ phone: e.target.value })}
        onBlur={() => updatePersonal({ phone: cleanWhitespace(p.phone) })}
        placeholder="+91 98765 43210"
        error={p.phone && !isValidPhone(p.phone) ? "Enter a valid phone number." : undefined}
        autoComplete="tel"
      />
      <Input
        label="Location"
        value={p.location}
        onChange={(e) => updatePersonal({ location: e.target.value })}
        onBlur={() => updatePersonal({ location: cleanWhitespace(p.location) })}
        placeholder="Bengaluru, KA"
        autoComplete="address-level2"
      />
      <Input
        label="LinkedIn"
        optional
        value={p.linkedin}
        onChange={(e) => updatePersonal({ linkedin: e.target.value })}
        onBlur={() => updatePersonal({ linkedin: normalizeProfileUrl(p.linkedin) })}
        placeholder="linkedin.com/in/aaravmehta"
        error={p.linkedin && !isValidUrl(p.linkedin) ? "Enter a valid URL." : undefined}
      />
      <Input
        label="GitHub"
        optional
        value={p.github}
        onChange={(e) => updatePersonal({ github: e.target.value })}
        onBlur={() => updatePersonal({ github: normalizeProfileUrl(p.github) })}
        placeholder="github.com/aaravmehta"
        error={p.github && !isValidUrl(p.github) ? "Enter a valid URL." : undefined}
      />
      <Input
        label="Portfolio"
        optional
        value={p.portfolio}
        onChange={(e) => updatePersonal({ portfolio: e.target.value })}
        onBlur={() => updatePersonal({ portfolio: normalizeProfileUrl(p.portfolio) })}
        placeholder="aaravmehta.dev"
        error={p.portfolio && !isValidUrl(p.portfolio) ? "Enter a valid URL." : undefined}
        className="sm:col-span-2"
      />
    </div>
  );
}
