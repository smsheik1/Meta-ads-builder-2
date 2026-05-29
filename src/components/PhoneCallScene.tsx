import React from 'react';
import { Battery, CircleEllipsis, Grid3X3, MicOff, PhoneOff, Signal, Video, Volume2, Wifi } from 'lucide-react';
import { formatCallTimer, formatUsPhoneNumber, getPhoneCallPhase } from '../lib/phone-call';

export const PHONE_CALL_SCENE_WIDTH = 835;
export const PHONE_CALL_SCENE_HEIGHT = 1740;

type RingDurationSeconds = 0 | 1 | 2 | 3;

type PhoneCallSceneProps = {
  phoneNumber: string;
  seconds: number;
  ringDurationSeconds: RingDurationSeconds;
  scale?: number;
  className?: string;
  style?: React.CSSProperties;
};

const PHONE_CONTROLS = [
  { label: 'Speaker', icon: Volume2, active: true },
  { label: 'FaceTime', icon: Video },
  { label: 'Mute', icon: MicOff },
  { label: 'More', icon: CircleEllipsis },
  { label: 'End', icon: PhoneOff, danger: true },
  { label: 'Keypad', icon: Grid3X3 },
];

export function PhoneCallScene({
  phoneNumber,
  seconds,
  ringDurationSeconds,
  scale = 1,
  className,
  style,
}: PhoneCallSceneProps) {
  const px = (value: number) => value * scale;
  const formattedNumber = formatUsPhoneNumber(phoneNumber);
  const phase = getPhoneCallPhase(seconds, ringDurationSeconds);
  const activeSeconds = Math.max(0, seconds - ringDurationSeconds);
  const phoneNumberFontSize = formattedNumber.length > 12 ? px(85) : px(106);

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: px(PHONE_CALL_SCENE_WIDTH),
        height: px(PHONE_CALL_SCENE_HEIGHT),
        overflow: 'visible',
        borderRadius: px(126),
        background: 'linear-gradient(135deg,#f7f7f2 0%,#262b33 52%,#a4a49e 100%)',
        padding: px(7),
        boxShadow: `0 ${px(28)}px ${px(78)}px rgba(15,23,42,0.3)`,
        boxSizing: 'border-box',
        fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: px(-19),
          top: '17%',
          width: px(14),
          height: px(150),
          borderRadius: `${px(10)}px 0 0 ${px(10)}px`,
          background: '#9b9b94',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: px(-19),
          top: '29%',
          width: px(14),
          height: px(186),
          borderRadius: `${px(10)}px 0 0 ${px(10)}px`,
          background: '#9b9b94',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: px(-19),
          top: '28%',
          width: px(14),
          height: px(223),
          borderRadius: `0 ${px(10)}px ${px(10)}px 0`,
          background: '#9b9b94',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: px(7),
          borderRadius: px(110),
          background: '#020617',
          padding: px(14),
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            borderRadius: px(91),
            background: '#06283d',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at 18% 12%,rgba(255,255,255,0.46),transparent 26%),radial-gradient(circle at 18% 74%,rgba(0,255,204,0.55),transparent 34%),radial-gradient(circle at 80% 25%,rgba(0,105,150,0.95),transparent 46%),linear-gradient(145deg,#006f7d,#01415f 50%,#001a34)',
            }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.1)' }} />

          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: px(37),
              zIndex: 20,
              width: px(260),
              height: px(74),
              transform: 'translateX(-50%)',
              borderRadius: px(999),
              background: '#000',
            }}
          />

          <div
            style={{
              position: 'relative',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: `${px(74)}px ${px(84)}px 0`,
              color: '#fff',
            }}
          >
            <span style={{ fontSize: px(35), fontWeight: 800, letterSpacing: 0 }}>9:41</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: px(14) }}>
              <Signal size={px(37)} strokeWidth={2.7} />
              <Wifi size={px(37)} strokeWidth={2.7} />
              <Battery size={px(47)} strokeWidth={2.7} />
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              padding: `${px(246)}px ${px(65)}px ${px(93)}px`,
              color: '#fff',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  marginBottom: px(47),
                  color: 'rgba(255,255,255,0.72)',
                  fontSize: px(76),
                  fontWeight: 600,
                  lineHeight: 1.15,
                }}
              >
                {phase === 'ringing' ? 'calling...' : formatCallTimer(activeSeconds)}
              </div>

              <div style={{ marginLeft: px(-37), marginRight: px(-37), overflow: 'hidden' }}>
                <div
                  style={{
                    whiteSpace: 'nowrap',
                    fontSize: phoneNumberFontSize,
                    lineHeight: 1,
                    fontWeight: 650,
                    letterSpacing: 0,
                    transform: 'none',
                  }}
                >
                  {formattedNumber || '(555) 123-4567'}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                columnGap: px(74),
                rowGap: px(93),
              }}
            >
              {PHONE_CONTROLS.map(({ label, icon: Icon, active, danger }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: px(19) }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: px(169),
                      height: px(169),
                      borderRadius: px(999),
                      border: danger
                        ? `${px(2)}px solid #ef4444`
                        : active
                          ? `${px(2)}px solid rgba(255,255,255,0.3)`
                          : `${px(2)}px solid rgba(255,255,255,0.16)`,
                      background: danger ? '#dc2626' : active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      boxShadow: `0 ${px(10)}px ${px(28)}px rgba(15,23,42,0.2)`,
                      backdropFilter: 'blur(12px)',
                    }}
                  >
                    <Icon size={px(74)} strokeWidth={2.35} fill={danger ? '#fff' : 'none'} />
                  </div>
                  <span style={{ color: '#fff', fontSize: px(35), fontWeight: 560, lineHeight: 1 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
