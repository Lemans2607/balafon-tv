import { ChannelBox, ChannelLogo } from "planby";
import type { Channel } from "planby";
import { BALAFON_LOGO_URI } from "./planbyMappers";

interface Props {
  channel: Channel;
}

/* Rendu personnalisé de la chaîne Balafon TV (unique chaîne du portail),
   dimensionné pour une sidebar large façon Canal+/DSTV (logo net,
   nom en gros, statut de diffusion visible sans compression). */
export function BalafonChannel({ channel }: Props) {
  return (
    <ChannelBox top={channel.position.top} height={channel.position.height}>
      <div className="flex w-full items-center gap-3.5 px-5 text-left">
        <div className="relative shrink-0">
          <ChannelLogo
            src={channel.logo || BALAFON_LOGO_URI}
            alt=""
            aria-hidden
            style={{
              width: 48,
              height: 48,
              maxHeight: 48,
              maxWidth: 48,
              borderRadius: 999,
              border: "2px solid rgba(227,30,36,0.55)",
              boxShadow: "0 0 0 4px rgba(227,30,36,0.08)",
            }}
          />
          <span
            className="live-pulse absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ink-950 bg-balafon"
            aria-hidden
          />
        </div>
        <div className="min-w-0">
          <p className="font-display truncate text-[17px] font-black uppercase leading-none tracking-tight text-paper">
            Balafon <span className="text-balafon">TV</span>
          </p>
          <p className="mt-1.5 font-mono text-[10.5px] uppercase tracking-widest text-mist">
            Canal 04 · Douala
          </p>
          <p className="mt-1 flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider text-balafon">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-balafon" aria-hidden />
            À l’antenne
          </p>
        </div>
      </div>
    </ChannelBox>
  );
}
