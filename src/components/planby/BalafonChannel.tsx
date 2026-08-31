import { ChannelBox, ChannelLogo } from "planby";
import type { Channel } from "planby";
import { BALAFON_LOGO_URI } from "./planbyMappers";

interface Props {
  channel: Channel;
}

/* Rendu personnalisé de la chaîne Balafon TV (unique chaîne du portail) */
export function BalafonChannel({ channel }: Props) {
  return (
    <ChannelBox top={channel.position.top} height={channel.position.height}>
      <div className="flex w-full items-center gap-3 px-4 text-left">
        <ChannelLogo
          src={channel.logo || BALAFON_LOGO_URI}
          alt=""
          aria-hidden
          style={{ width: 36, height: 36, borderRadius: 9, maxHeight: 36, maxWidth: 36 }}
        />
        <div>
          <p className="font-display text-[15px] font-black uppercase leading-none tracking-tight text-paper">
            Balafon <span className="text-balafon">TV</span>
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-mist">
            Canal 04 · Douala
          </p>
        </div>
      </div>
    </ChannelBox>
  );
}
