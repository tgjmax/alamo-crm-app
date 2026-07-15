import { Button } from '@/components/ui/button';
import { WIDGET_TEMPLATES } from './widget-templates';

interface WidgetTemplateGalleryProps {
  /** Called with a template id, or `null` for a blank widget. */
  onSelect: (templateId: string | null) => void;
}

const CARD_CLASS = 'h-auto flex-col items-start gap-1 whitespace-normal p-4 text-left';

/** The starter-widget picker, shown both on the empty dashboard and behind "New widget". Purely
 * presentational — the caller decides what selecting a template does (navigate to the editor). */
export function WidgetTemplateGallery({ onSelect }: WidgetTemplateGalleryProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {WIDGET_TEMPLATES.map((t) => (
        <Button
          key={t.id}
          type="button"
          variant="outline"
          className={CARD_CLASS}
          onClick={() => onSelect(t.id)}
        >
          <span className="text-base font-semibold">{t.label}</span>
          <span className="text-sm font-normal text-muted-foreground">{t.description}</span>
        </Button>
      ))}
      <Button
        type="button"
        variant="outline"
        className={`${CARD_CLASS} border-dashed`}
        onClick={() => onSelect(null)}
      >
        <span className="text-base font-semibold">Blank widget</span>
        <span className="text-sm font-normal text-muted-foreground">Start from scratch and configure everything yourself.</span>
      </Button>
    </div>
  );
}
