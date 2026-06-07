import { Database, X } from 'lucide-react';
import { stripRichText } from '../../../lib/rich-text';
import type { SavedTemplate } from '../createSavedDesigns';

type TemplateLibraryTab = 'templates' | 'history';

const TemplatePreview = ({ template }: { template: SavedTemplate }) => {
  const headline = template.elements.find(element => element.componentRole === 'headline' || element.type === 'text');
  const subheadline = template.elements.find(element => element.componentRole === 'subheadline');
  const visualizer = template.elements.find(element => element.type === 'visualizer');
  const cta = template.elements.find(element => element.type === 'button');
  const hasCaptions = template.elements.some(element => element.type === 'caption');
  const hasLogo = template.elements.some(element => element.componentRole === 'logo');
  const headlineText = stripRichText(headline?.content || 'Headline');

  return (
    <div
      className="relative aspect-[9/16] w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-inner"
      style={{ backgroundColor: template.settings.bgColor }}
    >
      {template.settings.bgMedia?.type === 'video' && (
        <video
          src={template.settings.bgMedia.url}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          loop
          playsInline
          autoPlay
        />
      )}
      {template.settings.bgMedia?.type === 'image' && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${template.settings.bgMedia.url})` }}
        />
      )}
      {template.settings.bgMedia && template.settings.bgShadow && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: template.settings.bgShadowOpacity }}
        />
      )}
      <div className="absolute inset-x-0 top-[10%] flex justify-center">
        {hasLogo ? (
          <span className="h-2 w-8 rounded-full bg-emerald-500/80" />
        ) : (
          <span className="h-2 w-8 rounded-full bg-slate-200" />
        )}
      </div>

      <div className="absolute inset-x-2 top-[20%] flex min-h-[42px] items-center justify-center">
        <p
          className="line-clamp-3 text-center text-[11px] font-black leading-[0.95]"
          style={{ color: headline?.color || '#0f172a' }}
        >
          {headlineText}
        </p>
      </div>

      {subheadline && (
        <div className="absolute inset-x-4 top-[40%] flex justify-center">
          <span className="h-2 w-14 rounded-full" style={{ backgroundColor: subheadline.color || template.settings.accentColor }} />
        </div>
      )}

      {visualizer && (
        <div className="absolute inset-x-2 top-[52%] flex h-7 items-center gap-[2px]">
          {Array.from({ length: 12 }).map((_, index) => (
            <span
              key={index}
              className="flex-1 rounded-full"
              style={{
                height: `${22 + ((index * 9) % 46)}%`,
                backgroundColor: visualizer.barColor || template.settings.visualizerColor,
              }}
            />
          ))}
        </div>
      )}

      {hasCaptions && (
        <div className="absolute inset-x-5 top-[69%] flex justify-center">
          <span className="h-2 w-20 rounded-full" style={{ backgroundColor: template.settings.accentColor }} />
        </div>
      )}

      {cta && (
        <div className="absolute inset-x-4 bottom-[9%] h-4 rounded-full" style={{ backgroundColor: cta.backgroundColor || template.settings.accentColor }} />
      )}
    </div>
  );
};

type CreateDesignLibraryProps = {
  showCompactDesignLibrary: boolean;
  templateLibraryTab: TemplateLibraryTab;
  activeTemplateCount: number;
  activeTemplateItems: SavedTemplate[];
  historySaveWarning: string | null;
  getTemplateTitle: (template: SavedTemplate) => string;
  onTemplateLibraryTabChange: (tab: TemplateLibraryTab) => void;
  onLoadTemplate: (template: SavedTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onDeleteHistoryItem: (templateId: string) => void;
};

export const CreateDesignLibrary = ({
  showCompactDesignLibrary,
  templateLibraryTab,
  activeTemplateCount,
  activeTemplateItems,
  historySaveWarning,
  getTemplateTitle,
  onTemplateLibraryTabChange,
  onLoadTemplate,
  onDeleteTemplate,
  onDeleteHistoryItem,
}: CreateDesignLibraryProps) => {
  if (showCompactDesignLibrary) {
    return (
      <div className="hidden w-14 shrink-0 items-start justify-center border-l border-slate-200/70 bg-white/55 pt-5 xl:flex">
        <button
          type="button"
          onClick={() => onTemplateLibraryTabChange(templateLibraryTab === 'templates' ? 'history' : 'templates')}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 hover:shadow-md"
          title={templateLibraryTab === 'templates' ? 'No saved templates yet' : 'No download history yet'}
          aria-label={templateLibraryTab === 'templates' ? 'No saved templates yet' : 'No download history yet'}
        >
          <Database className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="wiggly-library hidden w-72 shrink-0 flex-col overflow-hidden xl:flex">
      <div className="border-b border-slate-100 p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="wiggly-panel-title uppercase">Design Library</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">Templates plus your last 20 downloaded ads.</p>
          </div>
          <span className="rounded-full bg-[#d9fff6] px-2 py-1 text-[11px] font-black text-slate-900">{activeTemplateCount}</span>
        </div>
        <div className="grid grid-cols-2 rounded-full border border-slate-200 bg-white/70 p-1">
          {(['templates', 'history'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onTemplateLibraryTabChange(tab)}
              className={`rounded-full px-2 py-1.5 text-xs font-bold transition ${templateLibraryTab === tab ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {tab === 'templates' ? 'Templates' : 'My History'}
            </button>
          ))}
        </div>
        {templateLibraryTab === 'history' && (
          <p className="mt-3 text-[11px] leading-relaxed text-slate-400">History is saved on this device after you download a video.</p>
        )}
        {historySaveWarning && templateLibraryTab === 'history' && (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-800">{historySaveWarning}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {activeTemplateItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
            <Database className="mb-3 h-5 w-5 text-slate-400" />
            <p className="text-sm font-bold text-slate-700">{templateLibraryTab === 'templates' ? 'No templates yet' : 'No download history yet'}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {templateLibraryTab === 'templates'
                ? 'When a layout works, save it here and reuse it for the next ad.'
                : 'Downloaded ads will appear here so you can bring them back exactly.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {activeTemplateItems.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => onLoadTemplate(template)}
                title={`Use ${getTemplateTitle(template)}`}
                className="wiggly-template-card group relative overflow-hidden rounded-2xl p-2 text-left transition active:scale-[0.99]"
              >
                <TemplatePreview template={template} />
                <div className="mt-2 flex items-center justify-between gap-1">
                  <p className="min-w-0 truncate text-xs font-bold text-slate-700">{getTemplateTitle(template)}</p>
                  <span className="text-[10px] font-semibold text-slate-400">{template.elements.length}</span>
                </div>
                <span className="pointer-events-none absolute inset-2 rounded-lg bg-indigo-500/0 transition group-hover:bg-indigo-500/5" />
                {!template.builtIn && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      templateLibraryTab === 'templates' ? onDeleteTemplate(template.id) : onDeleteHistoryItem(template.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        event.stopPropagation();
                        templateLibraryTab === 'templates' ? onDeleteTemplate(template.id) : onDeleteHistoryItem(template.id);
                      }
                    }}
                    title={templateLibraryTab === 'templates' ? 'Delete template' : 'Delete history item'}
                    className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-400 opacity-0 shadow-sm transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
