import {
  TimelineBox,
  TimelineDivider,
  TimelineDividers,
  TimelineTime,
  TimelineWrapper,
  useTimeline,
} from "planby";

interface Props {
  isBaseTimeFormat: boolean;
  isSidebar: boolean;
  isRTL: boolean;
  sidebarWidth: number;
  hourWidth: number;
  numberOfHoursInDay: number;
  offsetStartHoursRange: number;
  dayWidth: number;
}

/* ============================================================
   Timeline horizontale personnalisée — heures en monospace,
   séparateurs fins, format 24 h (06:00, 07:00 … 23:00, 00:00)
   ============================================================ */
export function BalafonTimeline(props: Props) {
  const { numberOfHoursInDay, offsetStartHoursRange, isBaseTimeFormat, isSidebar, sidebarWidth, hourWidth, dayWidth } =
    props;
  const { time, dividers } = useTimeline(numberOfHoursInDay, isBaseTimeFormat);

  const label = (index: number) => {
    const h = (offsetStartHoursRange + index) % 24;
    return `${String(h).padStart(2, "0")}:00`;
  };

  return (
    <TimelineWrapper isSidebar={isSidebar} sidebarWidth={sidebarWidth} dayWidth={dayWidth}>
      {time.map((_, index) => (
        <TimelineBox key={`tl-${index}`} width={hourWidth}>
          <TimelineTime isBaseTimeFormat={isBaseTimeFormat} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#9CA3AF" }}>
            {label(index)}
          </TimelineTime>
          <TimelineDividers>
            {dividers.map((_, dIndex) => (
              <TimelineDivider key={`dv-${dIndex}`} width={hourWidth} />
            ))}
          </TimelineDividers>
        </TimelineBox>
      ))}
    </TimelineWrapper>
  );
}
