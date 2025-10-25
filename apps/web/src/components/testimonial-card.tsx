export type TestimonialCardProps = {
  quote: string;
  author: string;
  role: string;
  company: string;
};

export function TestimonialCard({ quote, author, role, company }: TestimonialCardProps) {
  return (
    <div className="border-2 border-neutral-100 bg-white p-6 text-left">
      <div className="space-y-4">
        <p className="text-neutral-700 leading-relaxed">"{quote}"</p>
        <div className="border-t border-neutral-100 pt-4">
          <p className="font-semibold text-neutral-900">{author}</p>
          <p className="text-sm text-neutral-600">
            {role} at {company}
          </p>
        </div>
      </div>
    </div>
  );
}
