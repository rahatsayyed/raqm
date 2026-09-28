'use client';

import { useCallback, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import Link from 'next/link';
import gsap from 'gsap';
import { lenisInstance } from './SmoothScrollProvider';

export interface StaggeredMenuItem {
  label: string;
  ariaLabel: string;
  link: string;
  previewImage?: string;
}

export interface StaggeredMenuSocialItem {
  label: string;
  link: string;
}

interface StaggeredMenuProps {
  position?: 'left' | 'right';
  colors?: string[];
  items: StaggeredMenuItem[];
  socialItems?: StaggeredMenuSocialItem[];
  displaySocials?: boolean;
  displayItemNumbering?: boolean;
  menuButtonColor?: string;
  openMenuButtonColor?: string;
  accentColor?: string;
  changeMenuColorOnOpen?: boolean;
  isFixed?: boolean;
  closeOnClickAway?: boolean;
  onMenuOpen?: () => void;
  onMenuClose?: () => void;
}

export function StaggeredMenu({
  position = 'right',
  colors = ['#B497CF', '#5227FF'],
  items,
  socialItems = [],
  displaySocials = true,
  displayItemNumbering = true,
  menuButtonColor = '#fff',
  openMenuButtonColor = '#fff',
  accentColor = '#5227FF',
  changeMenuColorOnOpen = true,
  isFixed = false,
  closeOnClickAway = true,
  onMenuOpen,
  onMenuClose,
}: StaggeredMenuProps) {
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const preLayersRef = useRef<HTMLDivElement>(null);
  const preLayerElsRef = useRef<HTMLDivElement[]>([]);
  const plusHRef = useRef<HTMLSpanElement>(null);
  const plusVRef = useRef<HTMLSpanElement>(null);
  const iconRef = useRef<HTMLSpanElement>(null);
  const textInnerRef = useRef<HTMLSpanElement>(null);
  const [textLines, setTextLines] = useState(['Menu', 'Close']);

  const openTlRef = useRef<gsap.core.Timeline | null>(null);
  const closeTweenRef = useRef<gsap.core.Tween | null>(null);
  const spinTweenRef = useRef<gsap.core.Timeline | null>(null);
  const textCycleAnimRef = useRef<gsap.core.Tween | null>(null);
  const colorTweenRef = useRef<gsap.core.Tween | null>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const busyRef = useRef(false);
  const itemEntranceTweenRef = useRef<gsap.core.Tween | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const headerVisibleRef = useRef(true);
  const lastScrollYRef = useRef(0);

  useGSAP(
    () => {
      const panel = panelRef.current;
      const preContainer = preLayersRef.current;
      const plusH = plusHRef.current;
      const plusV = plusVRef.current;
      const icon = iconRef.current;
      const textInner = textInnerRef.current;
      if (!panel || !plusH || !plusV || !icon || !textInner) return;

      let preLayers: HTMLDivElement[] = [];
      if (preContainer) {
        preLayers = Array.from(preContainer.querySelectorAll<HTMLDivElement>('.sm-prelayer'));
      }
      preLayerElsRef.current = preLayers;

      const offscreen = position === 'left' ? -100 : 100;
      gsap.set([panel, ...preLayers], { xPercent: offscreen, opacity: 1 });
      if (preContainer) {
        gsap.set(preContainer, { xPercent: 0, opacity: 1 });
      }
      gsap.set(plusH, { transformOrigin: '50% 50%', rotate: 0 });
      gsap.set(plusV, { transformOrigin: '50% 50%', rotate: 90 });
      gsap.set(icon, { rotate: 0, transformOrigin: '50% 50%' });
      gsap.set(textInner, { yPercent: 0 });
      if (toggleBtnRef.current) gsap.set(toggleBtnRef.current, { color: menuButtonColor });
    },
    { scope: rootRef, dependencies: [menuButtonColor, position] }
  );

  const buildOpenTimeline = useCallback(() => {
    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return null;

    openTlRef.current?.kill();
    if (closeTweenRef.current) {
      closeTweenRef.current.kill();
      closeTweenRef.current = null;
    }
    itemEntranceTweenRef.current?.kill();

    const itemEls = Array.from(panel.querySelectorAll<HTMLElement>('.sm-panel-itemLabel'));
    const numberEls = Array.from(panel.querySelectorAll<HTMLElement>('.sm-panel-list[data-numbering] .sm-panel-item'));
    const socialTitle = panel.querySelector<HTMLElement>('.sm-socials-title');
    const socialLinks = Array.from(panel.querySelectorAll<HTMLElement>('.sm-socials-link'));

    const offscreen = position === 'left' ? -100 : 100;
    const layerStates = layers.map((el) => ({ el, start: offscreen }));
    const panelStart = offscreen;

    if (itemEls.length) {
      gsap.set(itemEls, { yPercent: 140, rotate: 10 });
    }
    if (numberEls.length) {
      gsap.set(numberEls, { '--sm-num-opacity': 0 });
    }
    if (socialTitle) {
      gsap.set(socialTitle, { opacity: 0 });
    }
    if (socialLinks.length) {
      gsap.set(socialLinks, { y: 25, opacity: 0 });
    }

    const tl = gsap.timeline({ paused: true });

    layerStates.forEach((ls, i) => {
      tl.fromTo(ls.el, { xPercent: ls.start }, { xPercent: 0, duration: 0.5, ease: 'power4.out' }, i * 0.07);
    });
    const lastTime = layerStates.length ? (layerStates.length - 1) * 0.07 : 0;
    const panelInsertTime = lastTime + (layerStates.length ? 0.08 : 0);
    const panelDuration = 0.65;
    tl.fromTo(panel, { xPercent: panelStart }, { xPercent: 0, duration: panelDuration, ease: 'power4.out' }, panelInsertTime);

    if (itemEls.length) {
      const itemsStartRatio = 0.15;
      const itemsStart = panelInsertTime + panelDuration * itemsStartRatio;
      tl.to(
        itemEls,
        { yPercent: 0, rotate: 0, duration: 1, ease: 'power4.out', stagger: { each: 0.1, from: 'start' } },
        itemsStart
      );
      if (numberEls.length) {
        tl.to(
          numberEls,
          { duration: 0.6, ease: 'power2.out', '--sm-num-opacity': 1, stagger: { each: 0.08, from: 'start' } },
          itemsStart + 0.1
        );
      }
    }

    if (socialTitle || socialLinks.length) {
      const socialsStart = panelInsertTime + panelDuration * 0.4;
      if (socialTitle) {
        tl.to(socialTitle, { opacity: 1, duration: 0.5, ease: 'power2.out' }, socialsStart);
      }
      if (socialLinks.length) {
        tl.to(
          socialLinks,
          {
            y: 0,
            opacity: 1,
            duration: 0.55,
            ease: 'power3.out',
            stagger: { each: 0.08, from: 'start' },
            onComplete: () => {
              gsap.set(socialLinks, { clearProps: 'opacity' });
            },
          },
          socialsStart + 0.04
        );
      }
    }

    openTlRef.current = tl;
    return tl;
  }, [position]);

  const playOpen = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    const tl = buildOpenTimeline();
    if (tl) {
      tl.eventCallback('onComplete', () => {
        busyRef.current = false;
      });
      tl.play(0);
    } else {
      busyRef.current = false;
    }
  }, [buildOpenTimeline]);

  const playClose = useCallback(() => {
    openTlRef.current?.kill();
    openTlRef.current = null;
    itemEntranceTweenRef.current?.kill();

    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return;

    const all = [...layers, panel];
    closeTweenRef.current?.kill();
    const offscreen = position === 'left' ? -100 : 100;
    closeTweenRef.current = gsap.to(all, {
      xPercent: offscreen,
      duration: 0.32,
      ease: 'power3.in',
      overwrite: 'auto',
      onComplete: () => {
        const itemEls = Array.from(panel.querySelectorAll<HTMLElement>('.sm-panel-itemLabel'));
        if (itemEls.length) {
          gsap.set(itemEls, { yPercent: 140, rotate: 10 });
        }
        const numberEls = Array.from(panel.querySelectorAll<HTMLElement>('.sm-panel-list[data-numbering] .sm-panel-item'));
        if (numberEls.length) {
          gsap.set(numberEls, { '--sm-num-opacity': 0 });
        }
        const socialTitle = panel.querySelector<HTMLElement>('.sm-socials-title');
        const socialLinks = Array.from(panel.querySelectorAll<HTMLElement>('.sm-socials-link'));
        if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
        if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });
        busyRef.current = false;
      },
    });
  }, [position]);

  const animateIcon = useCallback((opening: boolean) => {
    const icon = iconRef.current;
    const h = plusHRef.current;
    const v = plusVRef.current;
    if (!icon || !h || !v) return;
    spinTweenRef.current?.kill();
    if (opening) {
      gsap.set(icon, { rotate: 0, transformOrigin: '50% 50%' });
      spinTweenRef.current = gsap
        .timeline({ defaults: { ease: 'power4.out' } })
        .to(h, { rotate: 45, duration: 0.5 }, 0)
        .to(v, { rotate: -45, duration: 0.5 }, 0);
    } else {
      spinTweenRef.current = gsap
        .timeline({ defaults: { ease: 'power3.inOut' } })
        .to(h, { rotate: 0, duration: 0.35 }, 0)
        .to(v, { rotate: 90, duration: 0.35 }, 0)
        .to(icon, { rotate: 0, duration: 0.001 }, 0);
    }
  }, []);

  const animateColor = useCallback(
    (opening: boolean) => {
      const btn = toggleBtnRef.current;
      if (!btn) return;
      colorTweenRef.current?.kill();
      if (changeMenuColorOnOpen) {
        const targetColor = opening ? openMenuButtonColor : menuButtonColor;
        colorTweenRef.current = gsap.to(btn, { color: targetColor, delay: 0.18, duration: 0.3, ease: 'power2.out' });
      } else {
        gsap.set(btn, { color: menuButtonColor });
      }
    },
    [openMenuButtonColor, menuButtonColor, changeMenuColorOnOpen]
  );

  const animateText = useCallback((opening: boolean) => {
    const inner = textInnerRef.current;
    if (!inner) return;
    textCycleAnimRef.current?.kill();

    const currentLabel = opening ? 'Menu' : 'Close';
    const targetLabel = opening ? 'Close' : 'Menu';
    const cycles = 3;
    const seq = [currentLabel];
    let last = currentLabel;
    for (let i = 0; i < cycles; i++) {
      last = last === 'Menu' ? 'Close' : 'Menu';
      seq.push(last);
    }
    if (last !== targetLabel) seq.push(targetLabel);
    seq.push(targetLabel);
    setTextLines(seq);

    gsap.set(inner, { yPercent: 0 });
    const lineCount = seq.length;
    const finalShift = ((lineCount - 1) / lineCount) * 100;
    textCycleAnimRef.current = gsap.to(inner, {
      yPercent: -finalShift,
      duration: 0.5 + lineCount * 0.07,
      ease: 'power4.out',
    });
  }, []);

  const toggleMenu = useCallback(() => {
    const target = !openRef.current;
    openRef.current = target;
    setOpen(target);
    if (target) {
      onMenuOpen?.();
      playOpen();
    } else {
      onMenuClose?.();
      playClose();
    }
    animateIcon(target);
    animateColor(target);
    animateText(target);
  }, [playOpen, playClose, animateIcon, animateColor, animateText, onMenuOpen, onMenuClose]);

  const closeMenu = useCallback(() => {
    if (openRef.current) {
      openRef.current = false;
      setOpen(false);
      onMenuClose?.();
      playClose();
      animateIcon(false);
      animateColor(false);
      animateText(false);
    }
  }, [playClose, animateIcon, animateColor, animateText, onMenuClose]);

  const handleItemClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, link: string) => {
      closeMenu();
      if (link.startsWith('#')) {
        const target = document.querySelector(link);
        if (target) {
          event.preventDefault();
          history.pushState(null, '', link);
          if (lenisInstance) {
            lenisInstance.scrollTo(target as HTMLElement, { duration: 2.2 });
          } else {
            target.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }
    },
    [closeMenu]
  );

  useGSAP(
    () => {
      const header = headerRef.current;
      if (!header) return;

      if (open) {
        headerVisibleRef.current = true;
        gsap.to(header, { yPercent: 0, duration: 0.3, ease: 'power3.out', overwrite: 'auto' });
      }
    },
    { dependencies: [open] }
  );

  useGSAP(
    () => {
      const header = headerRef.current;
      if (!header) return;

      lastScrollYRef.current = window.scrollY;

      const handleScroll = () => {
        if (openRef.current) {
          lastScrollYRef.current = window.scrollY;
          return;
        }

        const currentY = window.scrollY;
        const delta = currentY - lastScrollYRef.current;

        if (currentY <= 8) {
          if (!headerVisibleRef.current) {
            headerVisibleRef.current = true;
            gsap.to(header, { yPercent: 0, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
          }
        } else if (delta > 4 && headerVisibleRef.current) {
          headerVisibleRef.current = false;
          gsap.to(header, { yPercent: -130, duration: 0.35, ease: 'power3.inOut', overwrite: 'auto' });
        } else if (delta < -4 && !headerVisibleRef.current) {
          headerVisibleRef.current = true;
          gsap.to(header, { yPercent: 0, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
        }

        lastScrollYRef.current = currentY;
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    },
    { dependencies: [] }
  );

  useGSAP(
    () => {
      if (!closeOnClickAway || !open) return;

      const handleClickOutside = (event: MouseEvent) => {
        if (
          panelRef.current &&
          !panelRef.current.contains(event.target as Node) &&
          toggleBtnRef.current &&
          !toggleBtnRef.current.contains(event.target as Node)
        ) {
          closeMenu();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    },
    { dependencies: [closeOnClickAway, open, closeMenu] }
  );

  return (
    <div
      ref={rootRef}
      className={`group z-40 pointer-events-none ${
        isFixed ? 'fixed inset-0 w-screen h-screen overflow-hidden' : 'relative w-full h-full'
      }`}
      style={{ ['--sm-accent' as string]: accentColor }}
      data-position={position}
      data-open={open || undefined}
    >
      <div
        ref={preLayersRef}
        className="absolute top-0 inset-x-0 lg:inset-x-auto lg:right-0 group-data-[position=left]:lg:right-auto group-data-[position=left]:lg:left-0 bottom-0 w-full lg:w-[clamp(280px,38vw,560px)] pointer-events-none z-5 opacity-0"
        aria-hidden="true"
      >
        {(() => {
          const raw = colors && colors.length ? colors.slice(0, 4) : ['#1e1e22', '#35353c'];
          const arr = [...raw];
          if (arr.length >= 3) {
            const mid = Math.floor(arr.length / 2);
            arr.splice(mid, 1);
          }
          return arr.map((c, i) => (
            <div
              key={i}
              className="sm-prelayer absolute top-0 right-0 h-full w-full translate-x-0 opacity-0"
              style={{ background: c }}
            />
          ));
        })()}
      </div>
      <header
        ref={headerRef}
        className="absolute top-0 left-0 w-full flex items-center justify-between py-6 px-8 bg-transparent pointer-events-none z-20 will-change-transform lg:right-0 lg:mx-auto lg:max-w-214.25"
        aria-label="Main navigation header"
      >
        <Link href="/" className="flex items-center text-ink-headline no-underline select-none pointer-events-auto" aria-label="Raqm home">
          <span className="font-display text-lg">Raqm</span>
        </Link>
        <button
          ref={toggleBtnRef}
          className="relative inline-flex items-center gap-[0.3rem] bg-transparent border-0 cursor-pointer text-ink-headline font-medium leading-none overflow-visible pointer-events-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-primary focus-visible:outline-offset-4 focus-visible:rounded"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="staggered-menu-panel"
          onClick={toggleMenu}
          type="button"
        >
          <span className="relative inline-block h-[1em] overflow-hidden whitespace-nowrap" aria-hidden="true">
            <span ref={textInnerRef} className="flex flex-col leading-none font-body">
              {textLines.map((l, i) => (
                <span className="block h-[1em] leading-none" key={i}>
                  {l}
                </span>
              ))}
            </span>
          </span>
          <span ref={iconRef} className="relative w-[14px] h-[14px] flex-none inline-flex items-center justify-center will-change-transform" aria-hidden="true">
            <span
              ref={plusHRef}
              className="absolute left-1/2 top-1/2 w-full h-[2px] bg-current rounded-[2px] -translate-x-1/2 -translate-y-1/2 will-change-transform"
            />
            <span
              ref={plusVRef}
              className="absolute left-1/2 top-1/2 w-full h-[2px] bg-current rounded-[2px] -translate-x-1/2 -translate-y-1/2 will-change-transform"
            />
          </span>
        </button>
      </header>

      <aside
        id="staggered-menu-panel"
        ref={panelRef}
        className="absolute top-0 inset-x-0 lg:inset-x-auto lg:right-0 group-data-[position=left]:lg:right-auto group-data-[position=left]:lg:left-0 w-full lg:w-[clamp(280px,38vw,560px)] h-full bg-surface flex flex-col pt-28 px-10 pb-10 overflow-y-auto z-10 pointer-events-auto opacity-0"
        aria-hidden={!open}
      >
        <div className="flex-1 flex flex-col gap-5">
          <ul
            className="sm-panel-list list-none m-0 p-0 flex flex-col data-[numbering]:[counter-reset:smItem] group/list [&:has(.sm-panel-item:hover)_.sm-panel-item:not(:hover)]:opacity-40"
            role="list"
            data-numbering={displayItemNumbering || undefined}
          >
            {items.map((it, idx) => (
              <li
                className="group/item relative overflow-hidden leading-none border-b border-border-subtle py-2 last:border-b-0"
                key={it.label + idx}
              >
                <a
                  className="sm-panel-item relative text-ink-headline font-display text-[2.75rem] cursor-pointer leading-none transition-[color,opacity] duration-[250ms] inline-block no-underline pr-[1.4em] hover:text-[var(--sm-accent,var(--color-accent-primary))] group-data-[numbering]/list:after:[counter-increment:smItem] group-data-[numbering]/list:after:content-[counter(smItem,decimal-leading-zero)] group-data-[numbering]/list:after:absolute group-data-[numbering]/list:after:top-[0.15em] group-data-[numbering]/list:after:right-[1.6em] group-data-[numbering]/list:after:font-mono group-data-[numbering]/list:after:not-italic group-data-[numbering]/list:after:text-[14px] group-data-[numbering]/list:after:font-normal group-data-[numbering]/list:after:text-[var(--sm-accent,var(--color-accent-primary))] group-data-[numbering]/list:after:tracking-normal group-data-[numbering]/list:after:pointer-events-none group-data-[numbering]/list:after:select-none group-data-[numbering]/list:after:opacity-[var(--sm-num-opacity,0)]"
                  href={it.link}
                  aria-label={it.ariaLabel}
                  data-index={idx + 1}
                  onClick={(event) => handleItemClick(event, it.link)}
                >
                  <span className="sm-panel-itemLabel inline-block will-change-transform [transform-origin:50%_100%]">{it.label}</span>
                </a>
                <span
                  className="pointer-events-none absolute right-6 top-1/2 h-10 w-14 -translate-y-1/2 translate-x-2 scale-95 overflow-hidden rounded-sm opacity-0 transition-[opacity,transform] duration-300 ease-out group-hover/item:translate-x-0 group-hover/item:scale-100 group-hover/item:opacity-100"
                  aria-hidden="true"
                >
                  {it.previewImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.previewImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span
                      className="block h-full w-full"
                      style={{ background: `color-mix(in srgb, var(--sm-accent, var(--color-accent-primary)) ${22 + (idx % 4) * 14}%, transparent)` }}
                    />
                  )}
                </span>
              </li>
            ))}
          </ul>
          {displaySocials && socialItems.length > 0 && (
            <div className="mt-auto pt-8 border-t border-border-subtle flex flex-col gap-3" aria-label="Social links">
              <h3 className="sm-socials-title m-0 font-body text-[0.85rem] font-medium uppercase tracking-[0.04em] text-[var(--sm-accent,var(--color-accent-primary))]">
                Socials
              </h3>
              <ul
                className="list-none m-0 p-0 flex flex-row items-center gap-4 flex-wrap [&:hover_.sm-socials-link:not(:hover)]:opacity-45 [&:focus-within_.sm-socials-link:not(:focus-visible)]:opacity-45"
                role="list"
              >
                {socialItems.map((s, i) => (
                  <li key={s.label + i}>
                    <a
                      href={s.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sm-socials-link font-body text-base font-medium text-ink-headline no-underline relative inline-block py-[2px] opacity-100 transition-[color,opacity] duration-300 ease-linear hover:text-[var(--sm-accent,var(--color-accent-primary))] focus-visible:text-[var(--sm-accent,var(--color-accent-primary))] focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--sm-accent,var(--color-accent-primary))] focus-visible:outline-offset-[3px]"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
