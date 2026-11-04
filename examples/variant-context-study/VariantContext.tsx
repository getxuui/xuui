import type { ReactNode } from 'react';
import {
  CaretDown,
  CaretRight,
  Copy,
  Diamond,
  Hash,
  Info,
  Rows,
} from '@phosphor-icons/react';
import type { StudioBindings } from '../../src/xuui/parameters';
import { AfterHoursCard, PaperCard } from '../card-study/Cards';

/* A mock of the studio, drawn with the studio's own tokens so it follows the
   theme. The card study supplies the content being explained. */

const study = {
  name: 'Card exploration',
  description: 'Two ways to make a little room for the everyday.',
};

const rationales = {
  typical:
    'Lead with a quiet botanical study. A generous image and a simple hierarchy make the session feel considered and approachable.',
  limit:
    'Lead with a quiet botanical study. A generous image and a simple hierarchy make the session feel considered and approachable. The cost is a lower action: people who arrive ready to book scroll past the image first, so it suits slow browsing more than quick, returning visitors.',
};

const variants = [
  {
    id: 'paper',
    name: 'Paper',
    description: 'Warm, tactile, and a little slower.',
    Card: PaperCard,
  },
  {
    id: 'after-hours',
    name: 'After hours',
    description: 'A bold invitation to switch off.',
    Card: AfterHoursCard,
  },
];

const cardBindings = (color: string, borderRadius: number): StudioBindings => ({
  props: { fontWeight: 500, borderRadius, color },
  state: {},
});

function rationaleFor({ props }: StudioBindings) {
  return props.rationale === 'limit' ? rationales.limit : rationales.typical;
}

function Shell({
  left,
  canvas,
  right,
}: {
  left: ReactNode;
  canvas: ReactNode;
  right: ReactNode;
}) {
  return (
    <div
      className="grid h-[720px] w-[1200px] grid-cols-[224px_1fr_256px] overflow-hidden rounded-xl border border-border bg-studio-background pb-3 font-sans text-foreground"
      data-xuui-layer-name="Studio"
    >
      {left}
      <div className="min-w-0 pt-5" data-xuui-layer-name="Canvas column">
        {canvas}
      </div>
      {right}
    </div>
  );
}

function LeftPanel({
  studyDescription = false,
  pageDescriptions = false,
}: {
  studyDescription?: boolean;
  pageDescriptions?: boolean;
}) {
  return (
    <aside
      className="flex min-w-0 flex-col px-4 pt-3 text-xs"
      data-xuui-layer-name="Layers panel"
    >
      <span className="mb-3 size-4 rounded-sm bg-brand" aria-hidden />
      <div className="flex h-7 items-center justify-between rounded-lg bg-brand/12 px-2.5 text-(--brand-text)">
        {study.name}
        <CaretDown />
      </div>
      {studyDescription && (
        <p
          className="mt-2 px-0.5 leading-4 text-muted-foreground"
          data-xuui-layer-name="Study description"
        >
          {study.description}
        </p>
      )}
      <ul className="mt-3 flex flex-col gap-0.5">
        <li className="flex h-7 items-center gap-2 px-2">
          <Rows /> All
        </li>
        {variants.map((variant, index) => (
          <li
            key={variant.id}
            className={
              'flex gap-2 rounded-lg px-2 ' +
              (pageDescriptions ? 'py-1.5 ' : 'h-7 items-center ') +
              (index === 0 ? 'bg-brand/12 text-(--brand-text)' : '')
            }
          >
            <Diamond className={pageDescriptions ? 'mt-0.5 shrink-0' : ''} />
            <span className="min-w-0">
              {variant.name}
              {pageDescriptions && (
                <span
                  className="block leading-4 text-muted-foreground"
                  data-xuui-layer-name="Variant description"
                >
                  {variant.description}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t border-border pt-3 text-muted-foreground">
        <div className="flex items-center justify-between">
          Layers <CaretDown />
        </div>
        <ul className="mt-2 flex flex-col gap-2 text-foreground">
          <li className="flex items-center gap-1.5">
            <CaretDown /> <Hash /> Paper
          </li>
          <li className="flex items-center gap-1.5 pl-4">
            <CaretRight /> <Hash /> Leaf study
          </li>
          <li className="flex items-center gap-1.5 pl-4">
            <CaretRight /> <Hash /> Card content
          </li>
        </ul>
      </div>
    </aside>
  );
}

function Canvas({ children }: { children: ReactNode }) {
  return (
    <section
      className="relative flex h-full items-center justify-center rounded-xl border border-canvas-border bg-canvas"
      data-xuui-layer-name="Canvas"
    >
      {children}
    </section>
  );
}

function FrameLabel({
  name,
  onClick,
  open,
}: {
  name: string;
  onClick?: () => void;
  open?: boolean;
}) {
  const label = (
    <>
      <Hash /> {name}
      {onClick && <Info className="text-muted-foreground" />}
    </>
  );
  return onClick ? (
    <button
      type="button"
      aria-label={`About ${name}`}
      aria-expanded={open}
      onClick={onClick}
      className="flex items-center gap-1.5 self-start rounded-md px-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-expanded:bg-muted aria-expanded:text-foreground"
    >
      {label}
    </button>
  ) : (
    <span className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
      {label}
    </span>
  );
}

function Frame({
  variant,
  label,
  caption,
  scale = 0.8,
}: {
  variant: (typeof variants)[number];
  label: ReactNode;
  caption?: boolean;
  scale?: number;
}) {
  const { Card } = variant;
  const bindings =
    variant.id === 'paper'
      ? cardBindings('#2e493b', 8)
      : cardBindings('#d4e8a7', 4);
  return (
    <figure
      className="relative m-0 flex flex-col gap-2"
      style={{ width: 304 * scale }}
      data-xuui-layer-name={`${variant.name} frame`}
    >
      {label}
      {/* zoom, unlike scale, shrinks the layout box so captions follow. */}
      <div style={{ zoom: scale }}>
        <Card {...bindings} />
      </div>
      {caption && (
        <figcaption
          className="px-1 text-xs leading-4 text-muted-foreground"
          data-xuui-layer-name="Variant description"
        >
          {variant.description}
        </figcaption>
      )}
    </figure>
  );
}

/** Frames sit side by side from a shared top edge, as in the All view. */
function AllFrames() {
  return (
    <div className="flex items-start gap-12">
      {variants.map((variant) => (
        <Frame
          key={variant.id}
          variant={variant}
          label={<FrameLabel name={variant.name} />}
          caption
          scale={0.7}
        />
      ))}
    </div>
  );
}

function RightPanel({ about }: { about?: ReactNode }) {
  return (
    <aside
      className="flex min-w-0 flex-col gap-5 px-4 pt-3 text-xs"
      data-xuui-layer-name="Sidebar"
    >
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Properties</h2>
        <Copy className="text-muted-foreground" />
      </header>
      {about}
      <section className="flex flex-col gap-1.5">
        <h3 className="font-medium">Props</h3>
        {['Font weight', 'Border radius', 'Color'].map((name) => (
          <div
            key={name}
            className="flex h-7 items-center rounded-lg bg-muted px-2.5 text-muted-foreground"
          >
            {name}
          </div>
        ))}
      </section>
      <section className="flex flex-col gap-1.5">
        <h3 className="font-medium">Comments</h3>
        <div className="rounded-lg bg-muted p-3">
          <span className="rounded-sm bg-brand px-1 text-[10px] font-semibold text-brand-foreground">
            1
          </span>
          <p className="mt-2">Could the action sit higher?</p>
        </div>
      </section>
    </aside>
  );
}

function About({
  bindings,
  name,
  description,
}: {
  bindings: StudioBindings;
  name?: string;
  description: string;
}) {
  return (
    <section
      className="flex flex-col gap-1.5"
      data-xuui-layer-name="Variant rationale"
    >
      {name && <h3 className="font-medium">{name}</h3>}
      <p className="text-muted-foreground">{description}</p>
      <p className="leading-[18px] text-pretty">{rationaleFor(bindings)}</p>
    </section>
  );
}

export function SidebarRationale(bindings: StudioBindings) {
  return (
    <Shell
      left={<LeftPanel />}
      canvas={
        <Canvas>
          <Frame variant={variants[0]} label={<FrameLabel name="Paper" />} />
        </Canvas>
      }
      right={
        <RightPanel
          about={
            <About
              bindings={bindings}
              name="Paper"
              description={variants[0].description}
            />
          }
        />
      }
    />
  );
}

export function AllViewCaptions() {
  return (
    <Shell
      left={<LeftPanel />}
      canvas={
        <Canvas>
          <AllFrames />
        </Canvas>
      }
      right={<RightPanel />}
    />
  );
}

export function PageListDescriptions() {
  return (
    <Shell
      left={<LeftPanel studyDescription pageDescriptions />}
      canvas={
        <Canvas>
          <Frame variant={variants[0]} label={<FrameLabel name="Paper" />} />
        </Canvas>
      }
      right={<RightPanel />}
    />
  );
}

/** The description leads as the popover's title, above a quieter rationale. */
function TitledAbout({
  bindings,
  description,
}: {
  bindings: StudioBindings;
  description: string;
}) {
  return (
    <section
      className="flex flex-col gap-1"
      data-xuui-layer-name="Variant rationale"
    >
      <h3 className="text-sm leading-5 font-medium text-balance">
        {description}
      </h3>
      <p className="leading-[18px] text-pretty text-muted-foreground">
        {rationaleFor(bindings)}
      </p>
    </section>
  );
}

export function LabelPopover(bindings: StudioBindings) {
  return (
    <PopoverStudy bindings={bindings}>
      <About bindings={bindings} description={variants[0].description} />
    </PopoverStudy>
  );
}

export function LabelPopoverTitled(bindings: StudioBindings) {
  return (
    <PopoverStudy bindings={bindings}>
      <TitledAbout bindings={bindings} description={variants[0].description} />
    </PopoverStudy>
  );
}

function PopoverStudy({
  bindings,
  children,
}: {
  bindings: StudioBindings;
  children: ReactNode;
}) {
  const { machine } = bindings;
  const open = machine?.value === 'open';
  return (
    <Shell
      left={<LeftPanel />}
      canvas={
        <Canvas>
          <div className="relative">
            <Frame
              variant={variants[0]}
              label={
                <FrameLabel
                  name="Paper"
                  open={open}
                  onClick={() => machine?.send(open ? 'Close' : 'Open')}
                />
              }
            />
            {open && (
              <div
                role="dialog"
                aria-label="About Paper"
                className="absolute top-7 left-0 z-10 w-72 rounded-xl border border-border bg-popover p-3 text-xs shadow-studio-floating"
              >
                {children}
              </div>
            )}
          </div>
        </Canvas>
      }
      right={<RightPanel />}
    />
  );
}

export function SidebarAndCaptions(bindings: StudioBindings) {
  const all = bindings.state.view === 'all';
  return (
    <Shell
      left={<LeftPanel studyDescription />}
      canvas={
        <Canvas>
          {all ? (
            <AllFrames />
          ) : (
            <Frame variant={variants[0]} label={<FrameLabel name="Paper" />} />
          )}
        </Canvas>
      }
      right={
        <RightPanel
          about={
            <About
              bindings={bindings}
              name="Paper"
              description={variants[0].description}
            />
          }
        />
      }
    />
  );
}
