/**
 * Case-study journey content.
 *
 * Every case is a list of scenes (slides). A scene's blocks fly in, rest while you read,
 * then fly out while the next scene is already zooming in behind them.
 *
 * Positions are in design pixels:
 *  - desktop → the 1920×1080 Figma frame
 *  - mobile  → a 390×844 frame
 * Text: x/y = top-left of the first line's capital letters (Figma's cap-trimmed text box),
 *       w = text box width. Leave `x` / `y` out to centre the block on screen.
 * Image / video: x/y = centre of the block, h = height.
 *
 * Motion rules (handled by the journey scene):
 *  - text: always 100% opacity, flies in/out of frame
 *  - image / video: 0% → 100% at rest → 0% on the way out
 *  - `enter` / `exit` pick the direction; leave them out for an automatic pick
 *  - `via` makes a block glide to a second point while it is on screen
 */

export type Direction =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  /** Far away in the distance: zooms in from tiny / recedes into the distance. */
  | "depth"
  /** Behind the camera: blasts in huge and shrinks into place / flies out through the screen. */
  | "camera";

/**
 * How a block moves on its way in or out (on top of the direction):
 * - "auto"    sides swing like a door, top/bottom flip like a card, corners tumble, depth spirals
 * - "scatter" text only: title and every paragraph fly from a different side and assemble
 * - "bounce"  drops in and bounces into place
 * - "roll"    rolls like a wheel (full turn)
 * - "flip"    full 360° flip while flying
 * - "stretch" stretches along its path at speed, snaps back to shape
 * - "slide"   exit only: keeps the exact on-screen size and slides straight out (no zoom)
 * - "pipe"    entry, images only: flies in rolled up as a round tube, then unrolls flat
 */
export type Fx = "auto" | "scatter" | "bounce" | "roll" | "flip" | "stretch" | "slide" | "pipe";

type Motion = {
  /**
   * Fly-through: fade-in length in world units (default 10). Longer = gradual opacity by
   * distance, so near ones are solid and the ones behind them faint.
   */
  fade?: number;
  /**
   * Fly-through: shift when this block fades in, in world units. Positive = appears later
   * (closer to the camera), negative = appears earlier.
   */
  appear?: number;
  /**
   * Fly-through exit glide: after its reading point the block drifts toward its `exit`
   * side by this many world units per unit the camera advances (0 = pure fly-past).
   */
  drift?: number;
  /**
   * Fly-through: stay on screen for this many following slides — the block travels slowly
   * with the camera (growing gently), then leaves together with the last of them.
   */
  hold?: number;
  /**
   * Fly-through lane for a slide's main block (desktop): "left"/"right" sit just off the
   * centre line so the camera passes beside them and they leave out of that side, like
   * the reference; "center" flies straight through. Default: taken from `exit`.
   */
  lane?: "left" | "right" | "center";
  /**
   * Images/videos: depth layer in world units (positive = further back, negative = closer).
   * Same spot and size at rest, but layers slide past each other as the camera moves.
   */
  depth?: number;
  /** Images/videos: how much the block floats while at rest (1 = default, 2 = drifting). */
  float?: number;
  enter?: Direction;
  exit?: Direction;
  /** Animation style on the way in. */
  fx?: Fx;
  /** Animation style on the way out. */
  fxOut?: Fx;
  /** Multiplies the in-flight rotation. 0 = no spin, 1 = default, 2 = wild. */
  spin?: number;
};

type Via = { via?: { x: number; y: number } };
/** Leave `x` / `y` out to centre the block on screen. */
type TextPlace = { x?: number; y?: number; w: number } & Via;
type MediaPlace = { x: number; y: number; h: number } & Via;

/**
 * A paragraph. Plain string, or with a bold `lead` (drawn first, then `text`)
 * and an optional list `marker` such as "•" or "1.".
 */
export type Paragraph = string | { text: string; lead?: string; marker?: string };

export type TextBlock = Motion & {
  kind: "text";
  /** Bold title, followed by blank line(s) before the paragraphs. */
  title?: string;
  /** Blank lines between the title and the first paragraph (default 1). */
  titleGap?: number;
  /** Text colour (default white), e.g. dark text on a light image. */
  color?: string;
  /** Text size multiplier (1 = the standard 24px style). */
  scale?: number;
  /** Font weight for the paragraphs (default 400). */
  weight?: 400 | 600 | 700;
  /** Soft drop shadow under the text (Figma: 0 6px 17px rgba(0,0,0,0.35)). */
  shadow?: boolean;
  /** Rotation in degrees, e.g. -90 for text running bottom-to-top. */
  rotate?: number;
  paragraphs?: Paragraph[];
  desktop: TextPlace;
  mobile: TextPlace;
};

export type ImageBlock = Motion & {
  kind: "image";
  /**
   * Fly-through backdrop (like the reference's beach scene): a full-screen picture far
   * behind the slide. It appears with the slide, everything passes in front of it, and it
   * fades away just before the camera reaches it.
   */
  backdrop?: boolean;
  src: string;
  alt: string;
  /** Drawn instead of the image when the file is missing. */
  fallbackText?: string;
  desktop: MediaPlace;
  mobile: MediaPlace;
};

export type VideoBlock = Motion & {
  kind: "video";
  /** Shown on the phone screen until the video starts (and when there is no video yet). */
  poster: string;
  /** Plays once the phone reaches the centre. Leave out to show only the poster. */
  src?: string;
  /** Set false for silent videos (e.g. a screen recording) — no sound button. */
  sound?: boolean;
  /**
   * "phone" plays inside the iPhone GLB; "flat" is a plain video panel; "browser" plays
   * inside a browser window (title bar, window dots, address bar) — for website recordings.
   */
  frame: "phone" | "flat" | "browser";
  /** Address shown in the browser bar (frame "browser"). */
  url?: string;
  desktop: MediaPlace & { tilt?: number };
  mobile: MediaPlace & { tilt?: number };
};

export type SceneBlock = TextBlock | ImageBlock | VideoBlock;

export type Scene = {
  blocks: SceneBlock[];
  /** Scroll length of this slide: 1 = normal, smaller = fast-forward (e.g. 0.35). */
  pace?: number;
  /**
   * Fly-through: distance from the previous slide, as a share of the normal gap. Smaller =
   * slides sit closer in depth, so several are on screen at once at different distances.
   */
  gap?: number;
  /**
   * Lens distortion on the way out only (never while active). Text slides
   * only — it bends the whole screen, so keep it off slides next to a phone or logo.
   */
  lens?: boolean;
};

export type CaseStudy = {
  /**
   * Liquid background colours while this case study is on screen (color1 = the glow,
   * color2–4 = the base). Leave out for the default purple. Changes ease in smoothly.
   */
  background?: readonly [string, string, string, string];
  slug: string;
  client: string;
  title: string;
  category: string;
  scenes: Scene[];
};

const HY_LOGO = "/images/clients/hy-conveyancing/logos/hy-conveyancing-logo.svg";
const HY = "/images/clients/hy-conveyancing";
const KYP = "/images/clients/kyp";
const SPRINGHILL = "/images/clients/springhill-hospice";
/** Springhill Hospice background: Terracotta with a soft Cream glow — warm and calm. */
export const SPRINGHILL_BACKGROUND = ["#f3d9b1", "#a8533a", "#a8533a", "#a8533a"] as const;
const GRIMM = "/images/clients/grimm-and-co";
const ROCHDALE_100_LOGO = "/images/clients/hy-conveyancing/logos/rochdale-100-logo.svg";

const MOBILE_TEXT = { w: 342 } as const;

const FIVE_CHAPTERS: Paragraph[] = [
  "We built five chapters, to be released over nine to twelve months:",
  {
    marker: "1.",
    lead: "The why.",
    text: " David and Dean's Rochdale: the street, the school, the band, the first home, the struggles first time buyers face, the FGTC movement.",
  },
  { marker: "2.", lead: "The teaser.", text: ' "Rochdale, we\'ve been thinking about first-time buyers."' },
  { marker: "3.", lead: "The launch.", text: " A hero film, registration opens, and a live counter as places fill." },
  { marker: "4.", lead: "The proof.", text: " The first buyers coming through, in their own words." },
  {
    marker: "5.",
    lead: "The open door.",
    text: " The first keys handed over, and other Rochdale businesses invited to fund the next hundred.",
  },
];

export const caseStudies: CaseStudy[] = [
  {
    // HY Conveyancing: deep teal with a soft aqua glow.
    background: ["#5fd3c4", "#1e6f73", "#1e6f73", "#1e6f73"],
    slug: "hy-group-rochdale-100",
    client: "HY Conveyancing",
    title: "HY Conveyancing",
    category: "The Rochdale 100",
    scenes: [
      // 1 — Intro (heading + body move together as one block)
      {
        blocks: [
          {
            kind: "text",
            title: "Sometimes, the best campaign stories don’t start with the clients logo...",
            titleGap: 2,
            paragraphs: [
              "This is story of two rochdale lads, born and bred in the town, who once played in a band in the old mills & now run a law firm here.",
            ],
            desktop: { w: 572 },
            mobile: MOBILE_TEXT,
            enter: "top-left",
            exit: "bottom",
            fx: "bounce",
            fxOut: "auto",
          },
        ],
      },
      // 2 — HY Conveyancing logo (in top-left, glide across, out straight to the right)
      {
        blocks: [
          {
            kind: "image",
            src: HY_LOGO,
            alt: "HY Conveyancing — Residential property solicitors",
            desktop: { x: 760, y: 540, h: 400, via: { x: 1160, y: 540 } },
            mobile: { x: 160, y: 422, h: 110, via: { x: 230, y: 422 } },
            enter: "top-left",
            exit: "right",
            fx: "auto",
            fxOut: "auto",
          },
        ],
      },
      // 3 — The Spark
      {
        blocks: [
          {
            kind: "text",
            title: "The SPARK",
            paragraphs: [
              "Dean and David grew up in Rochdale, went to school here, and played in a band together, Bye Johnny, in practice rooms in the old mills. Today they run HY Group, which includes HY Solicitors, HY Education and HY Conveyancing.",
              "They'd watched the For Generations To Come movement get people across the borough asking what they could do for the next generation.",
              "Their answer is The Rochdale Hundred. In 2027, HY will cover the legal fees for 100 first-time buyers buying their first home in the borough.",
            ],
            desktop: { w: 670 },
            mobile: MOBILE_TEXT,
            enter: "top",
            exit: "bottom",
            fx: "flip",
            fxOut: "slide",
          },
        ],
      },
      // 4 — The Rochdale 100 logo
      {
        blocks: [
          {
            kind: "image",
            src: ROCHDALE_100_LOGO,
            alt: "The Rochdale 100",
            desktop: { x: 960, y: 540, h: 537 },
            mobile: { x: 195, y: 422, h: 260 },
            enter: "top-right",
            exit: "right",
            fx: "roll",
            fxOut: "auto",
          },
        ],
      },
      // 5 — The Risk
      {
        blocks: [
          {
            kind: "text",
            title: "The RISK",
            paragraphs: [
              "A law firm offering to pay legal fees is a press release waiting to go wrong.",
              "Do it loudly and it looks like a promotion dressed up as kindness.",
              "the guys saw that risk from the first meeting, and so did we.",
              'So we set one rule for every frame: the firm is never the hero. Rochdale\'s first-time buyers and the town itself are. HY are just one of the hands helping out, and the only line they ever say is "this is our bit."',
            ],
            desktop: { w: 680 },
            mobile: MOBILE_TEXT,
            enter: "top-left",
            exit: "bottom-left",
            fx: "auto",
            fxOut: "auto",
          },
        ],
      },
      // 6 — Phone: Owd Betts Inn
      {
        blocks: [
          {
            kind: "video",
            frame: "phone",
            poster: "/images/clients/hy-conveyancing/posters/owd-betts.jpg",
            src: "https://res.cloudinary.com/aeh9u82k/video/upload/v1793105014/1._David_-_My_Town_Intro.mp4",
            desktop: { x: 960, y: 540, h: 728, tilt: 0.45 },
            mobile: { x: 195, y: 410, h: 560 },
            enter: "top",
            exit: "bottom-left",
            // Faces front in the middle, then turns a little and glides out to the side.
            drift: 1.3,
            fx: "auto",
            fxOut: "auto",
          },
        ],
      },
      // 7 — Listening first
      {
        blocks: [
          {
            kind: "text",
            title: "Listening first",
            paragraphs: [
              "Before a camera came out, we talked the story through with the team, so the initiative would be reflected properly. That shaped three choices.",
              {
                marker: "•",
                lead: "The whole borough",
                text: ". Heywood, Middleton, Littleborough and Milnrow appear alongside the town centre, so nobody feels it's only about one postcode.",
              },
              {
                marker: "•",
                lead: "Real voices.",
                text: " We interview first-time buyers and their parents about what buying a home costs now compared with thirty years ago. Every contributor chooses how they appear: on camera, voice only, or anonymised.",
              },
              {
                marker: "•",
                lead: "Earned, not bought.",
                text: " Any press comes because the cause is worth a story, not because HY paid for space.",
              },
            ],
            desktop: { w: 820 },
            mobile: MOBILE_TEXT,
            enter: "top-right",
            exit: "bottom-right",
            fx: "bounce",
            fxOut: "auto",
          },
        ],
      },
      // 8 — Phone: field / cow, Rochdale behind
      {
        blocks: [
          {
            kind: "video",
            frame: "phone",
            poster: "/images/clients/hy-conveyancing/posters/cow.jpg",
            src: "https://res.cloudinary.com/aeh9u82k/video/upload/v1793105372/2._Dean_-_My_Town_Intro.mp4",
            desktop: { x: 960, y: 540, h: 878, tilt: -0.45 },
            mobile: { x: 195, y: 410, h: 560 },
            enter: "top-left",
            exit: "bottom-right",
            // Faces front in the middle, then turns a little and glides out to the side.
            drift: 1.3,
            fx: "flip",
            fxOut: "stretch",
          },
        ],
      },
      // 9 — The story told with meaning
      {
        lens: true,
        blocks: [
          {
            kind: "text",
            title: "The story told with meaning",
            paragraphs: FIVE_CHAPTERS,
            desktop: { w: 965 },
            mobile: MOBILE_TEXT,
            enter: "top",
            exit: "bottom-right",
            fx: "stretch",
            fxOut: "slide",
          },
        ],
      },
      // 10 — How We made it
      {
        blocks: [
          {
            kind: "text",
            title: "How We made it",
            paragraphs: [
              "We shot documentary-style, mostly handheld, using borough-wide drone and B-roll.",
              "Every film is cut for Facebook, Instagram and TikTok, with captions burned in, because most people scroll with the sound off.",
              'A planned "Then & Now" film pairs an older Rochdale homeowner with a first-time buyer over a brew in a kitchen.',
            ],
            desktop: { w: 920 },
            mobile: MOBILE_TEXT,
            enter: "top-left",
            exit: "bottom",
            fx: "auto",
            fxOut: "auto",
          },
        ],
      },
      // 11–13 — Kitchen, café, road: one at a time, close behind each other (short scroll),
      // alternating sides of a clear middle like the reference — each opens out its own side.
      // Flat, muted, no sound button.
      {
        pace: 0.6,
        blocks: [
          {
            kind: "video",
            frame: "flat",
            poster: `${HY}/posters/kitchen.jpg`,
            src: "https://res.cloudinary.com/aeh9u82k/video/upload/v1794579727/HY_video_5-compressed.mp4",
            sound: false,
            desktop: { x: 560, y: 520, h: 760 },
            mobile: { x: 195, y: 410, h: 520 },
            enter: "depth",
            exit: "left",
          },
        ],
      },
      {
        pace: 0.6,
        blocks: [
          {
            kind: "video",
            frame: "flat",
            poster: `${HY}/posters/cafe.jpg`,
            src: "https://res.cloudinary.com/aeh9u82k/video/upload/v1794578952/HY_video_4-compressed.mp4",
            sound: false,
            desktop: { x: 1360, y: 540, h: 760 },
            mobile: { x: 195, y: 410, h: 520 },
            enter: "depth",
            exit: "right",
          },
        ],
      },
      {
        pace: 0.6,
        blocks: [
          {
            kind: "image",
            // "HY video 3.heic" is a still photo.
            src: `${HY}/posters/road.jpg`,
            alt: "Walking up a cobbled track above Rochdale",
            desktop: { x: 590, y: 500, h: 620 },
            mobile: { x: 195, y: 410, h: 420 },
            enter: "depth",
            exit: "left",
          },
        ],
      },
      // 14 — Five chapters (no title)
      {
        blocks: [
          {
            kind: "text",
            paragraphs: FIVE_CHAPTERS,
            desktop: { w: 965 },
            mobile: MOBILE_TEXT,
            enter: "depth",
            exit: "right",
            fx: "roll",
            fxOut: "auto",
          },
        ],
      },
    ],
  },
  {
    // Grimm & Co: Oxblood with a Copper glow (classic English storybook tones).
    background: ["#e08a4f", "#7b2233", "#7b2233", "#7b2233"],
    slug: "grimm-and-co",
    client: "Grimm & Co",
    title: "Grimm & Co",
    category: "The Tales of Grimm",
    scenes: [
      // 1 — Intro
      {
        blocks: [
          {
            kind: "text",
            title: "Most About Us pages just sit on the shelf. We took Grimm’s down and opened it...",
            titleGap: 2,
            paragraphs: [
              "The staircase at Grimm & Co is also a bookcase, with every step the spine of a book. So for the About section of their website, we slid a new book out of those stairs, The Tales of Grimm, and let it tell their story.",
            ],
            desktop: { w: 572 },
            mobile: MOBILE_TEXT,
            enter: "top-left",
            exit: "bottom",
            fx: "bounce",
            fxOut: "auto",
          },
        ],
      },
      // 2 — GRIMM & Co logo (leaves big, zooming past to the bottom-left)
      {
        blocks: [
          {
            kind: "image",
            src: `${GRIMM}/logos/grimm-and-co-logo.svg`,
            alt: "Grimm & Co",
            desktop: { x: 960, y: 507, h: 685 },
            mobile: { x: 195, y: 422, h: 260 },
            enter: "depth",
            exit: "bottom-left",
            fx: "auto",
            fxOut: "auto",
          },
        ],
      },
      // 3 — The place
      {
        blocks: [
          {
            kind: "text",
            title: "The place",
            paragraphs: [
              "Grimm & Co is a children's writing charity in Rotherham. Its home is a former Methodist church on Ship Hill, with big arched red doors and an Apothecary to the Magical at the front.",
              "The story goes that Graham Grimm has been selling to magical folk there since 1148.",
              "Every part of the space has been built to spark imagination, from the shop counter to the staircase. Walk in, and you're inside Grimm's story before anyone has explained a thing.",
            ],
            desktop: { w: 695 },
            mobile: MOBILE_TEXT,
            enter: "top-right",
            exit: "left",
            fx: "flip",
            fxOut: "auto",
          },
        ],
      },
      // 4 — The Space, step by step: two photos at a time either side of a clear middle,
      // close behind each other (short scroll); each opens out to its own side.
      {
        pace: 0.6,
        blocks: [
          {
            kind: "text",
            paragraphs: ["The Space"],
            // Stays in the centre while the photos arrive, zooming in only lightly, just behind
            // them (they always cover it); leaves once the last photo is in.
            depth: 7,
            hold: 2.1,
            desktop: { w: 400 },
            mobile: { w: 342 },
            enter: "depth",
            exit: "bottom",
          },
          {
            kind: "image",
            src: `${GRIMM}/photos/space-magic-o-meter.png`,
            alt: "The Magic-o-meter and bookshelves in the Grimm & Co shop",
            depth: 0,
            // Emerges from deep inside, the ones behind fainter.
            appear: -20,
            fade: 56,
            desktop: { x: 520, y: 470, h: 430 },
            mobile: { x: 195, y: 250, h: 170 },
            enter: "depth",
            exit: "left",
          },
          {
            kind: "image",
            src: `${GRIMM}/photos/space-stories-shop.png`,
            alt: "The Emporium of Stories shop counter",
            // Half a step behind its left partner, so it arrives right after it.
            depth: 22,
            // Emerges from deep inside, the ones behind fainter.
            appear: -20,
            fade: 56,
            desktop: { x: 1420, y: 620, h: 260 },
            mobile: { x: 195, y: 600, h: 120 },
            enter: "depth",
            exit: "right",
          },
        ],
      },
      {
        pace: 0.6,
        blocks: [
          {
            kind: "image",
            src: `${GRIMM}/photos/space-play-area.png`,
            alt: "The play area inside the old church",
            depth: 0,
            // Emerges from deep inside, the ones behind fainter.
            appear: -20,
            fade: 56,
            desktop: { x: 520, y: 430, h: 250 },
            mobile: { x: 195, y: 260, h: 120 },
            enter: "depth",
            exit: "left",
          },
          {
            kind: "image",
            src: `${GRIMM}/photos/space-bookcase.png`,
            alt: "A painted Apothecary bookcase",
            // Half a step behind its left partner, so it arrives right after it.
            depth: 22,
            // Emerges from deep inside, the ones behind fainter.
            appear: -20,
            fade: 56,
            desktop: { x: 1400, y: 600, h: 470 },
            mobile: { x: 195, y: 590, h: 220 },
            enter: "depth",
            exit: "right",
          },
        ],
      },
      {
        pace: 0.6,
        blocks: [
          {
            kind: "image",
            src: `${GRIMM}/photos/space-writing-room.png`,
            alt: "The writing room with its giant plant",
            depth: 0,
            // Emerges from deep inside, the ones behind fainter.
            appear: -20,
            fade: 56,
            desktop: { x: 520, y: 500, h: 360 },
            mobile: { x: 195, y: 260, h: 170 },
            enter: "depth",
            exit: "left",
          },
          {
            kind: "image",
            src: `${GRIMM}/photos/space-hall.png`,
            alt: "Children writing in the main hall",
            // Half a step behind its left partner, so it arrives right after it.
            depth: 22,
            // Emerges from deep inside, the ones behind fainter.
            appear: -20,
            fade: 56,
            desktop: { x: 1400, y: 560, h: 360 },
            mobile: { x: 195, y: 590, h: 170 },
            enter: "depth",
            exit: "right",
          },
        ],
      },
      // 5 — The Challenge
      {
        blocks: [
          {
            kind: "text",
            title: "The Challenge",
            paragraphs: [
              "Online, none of that came through. Over time, Grimm's website had lost the central story it was meant to tell.",
              "It had grown into a complicated, uninspiring digital doorway, the opposite of the real one on Ship Hill.",
              "Somebody finding Grimm online for the first time had no sense of the magic waiting for them, and so little reason to come.",
              "Grimm chose us to put that right: to tell the story of what you can expect to find at Grimm & Co, and to make people want to visit.",
            ],
            desktop: { w: 665 },
            mobile: MOBILE_TEXT,
            enter: "top",
            exit: "bottom-right",
            fx: "stretch",
            fxOut: "auto",
          },
        ],
      },
      // 6 — The old website (Grimm video 1, a silent screen recording, flat on the page)
      {
        blocks: [
          {
            kind: "video",
            frame: "browser",
            url: "grimmandco.co.uk",
            poster: `${GRIMM}/posters/website.jpg`,
            src: "https://res.cloudinary.com/aeh9u82k/video/upload/v1794577702/Grimm_video_1.mp4",
            sound: false,
            desktop: { x: 960, y: 511, h: 529 },
            mobile: { x: 195, y: 410, h: 172 },
            enter: "top-left",
            exit: "right",
            fx: "auto",
            fxOut: "auto",
          },
        ],
      },
      // 7 — Our Approach
      {
        blocks: [
          {
            kind: "text",
            title: "Our Approach",
            paragraphs: [
              "We started with the building, not the website. If the space is where the magic lives, the website's job is to feel like the first step of a visit, not a noticeboard you read before deciding whether to go.",
              "So we're working through the site section by section, taking each part of the real space and turning it into a way of telling Grimm's story on screen.",
              "The first concept we're sharing is the Our Story page, Grimm's About section.",
            ],
            desktop: { w: 665 },
            mobile: MOBILE_TEXT,
            enter: "top-right",
            exit: "bottom-left",
            fx: "roll",
            fxOut: "auto",
          },
        ],
      },
      // 8 — The book staircase
      {
        blocks: [
          {
            kind: "image",
            src: `${GRIMM}/photos/staircase.png`,
            alt: "The Grimm & Co staircase, every step the spine of a book",
            desktop: { x: 960, y: 525, h: 811 },
            mobile: { x: 195, y: 410, h: 236 },
            enter: "top",
            exit: "bottom",
            fx: "auto",
            fxOut: "auto",
          },
        ],
      },
      // 9 — Our Story Concept
      {
        blocks: [
          {
            kind: "text",
            title: "Our Story Concept",
            paragraphs: [
              "Inside the building, the staircase doubles as a bookcase. Every step is the spine of a children's book, from The Gruffalo and A Monster Calls to Dear Zoo and It's Grimm Up North.",
              "If the stairs are a bookcase, we thought, Grimm's own story should be one of the books on it. So we photographed the real staircase and slipped a new spine in among the real ones: The Tales of Grimm. That book became the way into the About section.",
              "Mission, vision, values and history stopped being paragraphs on a page and became chapters in Grimm's own book.",
              "Because it's built on a photo of the real staircase, everything people see on screen is somewhere they can actually stand in Rotherham.",
            ],
            desktop: { w: 665 },
            mobile: MOBILE_TEXT,
            enter: "top-left",
            exit: "right",
            fx: "auto",
            fxOut: "auto",
          },
        ],
      },
      // 10 — Like the reference's beach scene: the burnt OUR STORY paper fills the screen far
      // behind; "We developed each animation..." runs vertically through the middle and the
      // camera flies through it, then the paper fades away as the camera nears it.
      {
        blocks: [
          {
            kind: "text",
            paragraphs: ["We developed each animation..."],
            rotate: 90,
            // Appears (small, the whole line visible) once the background has blended in,
            // then zooms up as you scroll.
            appear: 23,
            // Figma: Montserrat 32px / 600, 7.36px tracking, soft shadow.
            scale: 32 / 24,
            weight: 600,
            shadow: true,
            desktop: { w: 900 },
            mobile: { w: 600 },
            enter: "depth",
            exit: "depth",
          },
          {
            kind: "image",
            src: `${GRIMM}/photos/our-story-burnt.jpg`,
            alt: "OUR STORY title art on burnt paper, with handwritten animation notes",
            backdrop: true,
            depth: 60,
            desktop: { x: 960, y: 540, h: 1750 },
            mobile: { x: 195, y: 422, h: 1350 },
            enter: "depth",
            exit: "depth",
          },
        ],
      },
      // 11–18 — "screen by screen": the caption stays in the centre (slowly zooming) while the
      // eight Our Story screens come one at a time around it — left / right, top / middle /
      // bottom — never over the text. Each opens out to its own side.
      {
        pace: 0.5,
        blocks: [
          {
            kind: "text",
            paragraphs: ["screen by screen"],
            // Centre caption held for all eight screens, just behind them; appears after the
            // OUR STORY background has cleared.
            depth: 7,
            hold: 3.6,
            appear: 26,
            desktop: { w: 500 },
            mobile: { w: 342 },
            enter: "depth",
            exit: "bottom",
          },
          {
            kind: "video",
            frame: "flat",
            poster: `${GRIMM}/photos/our-story-0.jpg`,
            sound: false,
            depth: 0,
            // Waits until the OUR STORY background has cleared.
            appear: 26,
            desktop: { x: 480, y: 330, h: 320 },
            mobile: { x: 195, y: 200, h: 166 },
            enter: "depth",
            exit: "left",
          },
        ],
      },
      {
        pace: 0.5,
        gap: 0.5,
        blocks: [
          {
            kind: "video",
            frame: "flat",
            poster: `${GRIMM}/photos/our-story-1.jpg`,
            sound: false,
            depth: 0,
            // Starts deep inside the screen and comes forward, growing more solid with
            // distance: the nearest is 100%, the one behind ~50%, the next ~10%.
            appear: -20,
            fade: 56,
            desktop: { x: 1440, y: 520, h: 320 },
            mobile: { x: 195, y: 640, h: 166 },
            enter: "depth",
            exit: "right",
          },
        ],
      },
      {
        pace: 0.5,
        gap: 0.5,
        blocks: [
          {
            kind: "video",
            frame: "flat",
            poster: `${GRIMM}/photos/our-story-2.jpg`,
            sound: false,
            depth: 0,
            // Starts deep inside the screen and comes forward, growing more solid with
            // distance: the nearest is 100%, the one behind ~50%, the next ~10%.
            appear: -20,
            fade: 56,
            desktop: { x: 480, y: 760, h: 320 },
            mobile: { x: 195, y: 200, h: 166 },
            enter: "depth",
            exit: "left",
          },
        ],
      },
      {
        pace: 0.5,
        gap: 0.5,
        blocks: [
          {
            kind: "video",
            frame: "flat",
            poster: `${GRIMM}/photos/our-story-3.jpg`,
            sound: false,
            depth: 0,
            // Starts deep inside the screen and comes forward, growing more solid with
            // distance: the nearest is 100%, the one behind ~50%, the next ~10%.
            appear: -20,
            fade: 56,
            desktop: { x: 1440, y: 330, h: 320 },
            mobile: { x: 195, y: 640, h: 166 },
            enter: "depth",
            exit: "right",
          },
        ],
      },
      {
        pace: 0.5,
        gap: 0.5,
        blocks: [
          {
            kind: "video",
            frame: "flat",
            poster: `${GRIMM}/photos/our-story-4.jpg`,
            sound: false,
            depth: 0,
            // Starts deep inside the screen and comes forward, growing more solid with
            // distance: the nearest is 100%, the one behind ~50%, the next ~10%.
            appear: -20,
            fade: 56,
            desktop: { x: 480, y: 520, h: 320 },
            mobile: { x: 195, y: 200, h: 166 },
            enter: "depth",
            exit: "left",
          },
        ],
      },
      {
        pace: 0.5,
        gap: 0.5,
        blocks: [
          {
            kind: "video",
            frame: "flat",
            poster: `${GRIMM}/photos/our-story-5.jpg`,
            sound: false,
            depth: 0,
            // Starts deep inside the screen and comes forward, growing more solid with
            // distance: the nearest is 100%, the one behind ~50%, the next ~10%.
            appear: -20,
            fade: 56,
            desktop: { x: 1440, y: 760, h: 320 },
            mobile: { x: 195, y: 640, h: 166 },
            enter: "depth",
            exit: "right",
          },
        ],
      },
      {
        pace: 0.5,
        gap: 0.5,
        blocks: [
          {
            kind: "video",
            frame: "flat",
            poster: `${GRIMM}/photos/our-story-6.jpg`,
            sound: false,
            depth: 0,
            // Starts deep inside the screen and comes forward, growing more solid with
            // distance: the nearest is 100%, the one behind ~50%, the next ~10%.
            appear: -20,
            fade: 56,
            desktop: { x: 480, y: 330, h: 320 },
            mobile: { x: 195, y: 200, h: 166 },
            enter: "depth",
            exit: "left",
          },
        ],
      },
      {
        pace: 0.5,
        gap: 0.5,
        blocks: [
          {
            kind: "video",
            frame: "flat",
            poster: `${GRIMM}/photos/our-story-7.jpg`,
            sound: false,
            depth: 0,
            // Starts deep inside the screen and comes forward, growing more solid with
            // distance: the nearest is 100%, the one behind ~50%, the next ~10%.
            appear: -20,
            fade: 56,
            desktop: { x: 1440, y: 520, h: 320 },
            mobile: { x: 195, y: 640, h: 166 },
            enter: "depth",
            exit: "right",
          },
        ],
      },
      // 19 — The outcome
      {
        blocks: [
          {
            kind: "text",
            title: "The outcome",
            paragraphs: ["And then we pull it all together."],
            desktop: { w: 665 },
            mobile: MOBILE_TEXT,
            enter: "top",
            exit: "left",
            fx: "bounce",
            fxOut: "auto",
          },
        ],
      },
      // 20 — Grimm & Co video 2: the finished Our Story page, flat in the middle
      {
        blocks: [
          {
            kind: "video",
            frame: "browser",
            url: "grimmandco.co.uk/our-story",
            poster: `${GRIMM}/posters/our-story.jpg`,
            src: "https://res.cloudinary.com/aeh9u82k/video/upload/v1794578272/Grimm_Co_video_2-compressed.mp4",
            sound: false,
            desktop: { x: 953, y: 517, h: 794 },
            mobile: { x: 195, y: 410, h: 190 },
            enter: "depth",
            exit: "bottom",
            fx: "auto",
            fxOut: "auto",
          },
        ],
      },
    ],
  },
  {
    // KYP: British Racing Green with a Mustard glow.
    background: ["#e0b04a", "#245c3e", "#245c3e", "#245c3e"],
    slug: "kyp",
    client: "KYP",
    title: "KYP",
    category: "PhotoVoice with the University of Glasgow",
    scenes: [
      // 1 — Through their own lens
      {
        blocks: [
          {
            kind: "text",
            title: "Through their own lens",
            paragraphs: [
              "We taught the skills, then stepped out of the shot",
            ],
            desktop: { w: 665 },
            mobile: MOBILE_TEXT,
            enter: "depth",
            exit: "bottom",
          },
        ],
      },
      // 2 — KYP × University of Glasgow
      {
        blocks: [
          {
            kind: "image",
            src: `${KYP}/logos/kyp-logo.svg`,
            alt: "KYP — Engaging, Empowering, Educating, since 1979",
            desktop: { x: 760, y: 540, h: 140 },
            mobile: { x: 195, y: 330, h: 90 },
            enter: "depth",
            exit: "left",
          },
          {
            kind: "text",
            paragraphs: ["x"],
            scale: 1.6,
            desktop: { w: 60 },
            mobile: { x: 186, y: 410, w: 60 },
            enter: "depth",
            exit: "bottom",
          },
          {
            kind: "image",
            src: `${KYP}/logos/university-of-glasgow-logo.svg`,
            alt: "University of Glasgow",
            desktop: { x: 1170, y: 540, h: 118 },
            mobile: { x: 195, y: 500, h: 76 },
            enter: "depth",
            exit: "right",
          },
        ],
      },
      // 3 — The Project
      {
        blocks: [
          {
            kind: "text",
            title: "The Project",
            paragraphs: [
              "The University of Glasgow's Policy Modelling for Health team uses a method called PhotoVoice.",
              "People take photos that capture their own experience and add captions in their own words. The pictures then become evidence that shapes policy.",
              "Here, they partnered with KYP (Kashmir Youth Project), a Rochdale charity working with South Asian and other ethnically diverse communities since 1979. The question was a big one: how do young people in Rochdale feel about their town, and about the jobs waiting for them? Eight young people took part. Each had a week to take five photos showing what it's like to prepare for and look for work here.",
            ],
            desktop: { w: 665 },
            mobile: MOBILE_TEXT,
            enter: "depth",
            exit: "bottom",
          },
        ],
      },
      // 4 — Consent form photo
      {
        blocks: [
          {
            kind: "image",
            src: `${KYP}/photos/consent-form.png`,
            alt: "A University of Glasgow participant consent form on the table during the session",
            desktop: { x: 960, y: 540, h: 620 },
            mobile: { x: 195, y: 422, h: 420 },
            enter: "depth",
            exit: "left",
          },
        ],
      },
      // 5 — The Brief
      {
        blocks: [
          {
            kind: "text",
            title: "The Brief",
            paragraphs: [
              "PhotoVoice is storytelling with a camera. Each photo and its caption tells a small piece of someone's life, and five together make a story nobody else could have told.",
              "The University didn't want great photographers. They wanted young people confident enough to tell that story their own way. So the brief was a short, informal session of optional techniques, each one a way to make a picture say what its owner means.",
            ],
            desktop: { w: 665 },
            mobile: MOBILE_TEXT,
            enter: "depth",
            exit: "bottom",
          },
        ],
      },
      // 6–8 — Three images, one after the other (like the reference), alternating sides,
      // close together: the one in front solid, the ones behind fainter.
      {
        pace: 0.6,
        blocks: [
          {
            kind: "image",
            src: `${KYP}/photos/menu-card.png`,
            alt: "Session slide: the storytelling techniques, from phone settings to editing",
            depth: 0,
            desktop: { x: 560, y: 480, h: 420 },
            mobile: { x: 195, y: 422, h: 180 },
            enter: "depth",
            exit: "left",
          },
        ],
      },
      {
        pace: 0.6,
        gap: 0.5,
        blocks: [
          {
            kind: "image",
            src: `${KYP}/photos/pink-card.png`,
            alt: "Session slide",
            depth: 0,
            // Starts deep inside and comes forward; the one behind is fainter.
            appear: -20,
            fade: 56,
            desktop: { x: 1380, y: 560, h: 360 },
            mobile: { x: 195, y: 422, h: 180 },
            enter: "depth",
            exit: "right",
          },
        ],
      },
      {
        pace: 0.6,
        gap: 0.5,
        blocks: [
          {
            kind: "image",
            src: `${KYP}/photos/portrait.png`,
            alt: "Example portrait: a young woman in an orange scarf against wooden slats",
            depth: 0,
            // Starts deep inside and comes forward; the one behind is fainter.
            appear: -20,
            fade: 56,
            desktop: { x: 560, y: 540, h: 400 },
            mobile: { x: 195, y: 422, h: 180 },
            enter: "depth",
            exit: "left",
          },
        ],
      },
      // 9 — What We Did
      {
        blocks: [
          {
            kind: "text",
            title: "What We Did",
            paragraphs: [
              "We led a hands-on hour at KYP. We didn't teach it as a photography lesson. We taught it as storytelling, where every technique answers a question a storyteller asks.",
              "It ran in six short parts, each followed straight away by a challenge to try around the building.",
              "Every participant left with an eight-page guide covering the same ground, so the skills went home with them for the week of shooting ahead.",
              "None of it was about having good kit. Every single image was taken on a phone.",
              "The aim was simple: by the end of the hour, each young person had the tools to show how they see Rochdale and their future in it, in a way that strangers reading research would actually feel.",
            ],
            desktop: { w: 665 },
            mobile: MOBILE_TEXT,
            enter: "depth",
            exit: "bottom",
          },
        ],
      },
      // 10 — PHONE PHOTOGRAPHY video in a browser window, plays until it leaves the screen
      {
        blocks: [
          {
            kind: "video",
            frame: "browser",
            url: "Phone Photography — KYP session",
            poster: `${KYP}/posters/phone-photography.jpg`,
            src: "https://res.cloudinary.com/aeh9u82k/video/upload/v1794582959/KYP_Video.mp4",
            sound: false,
            desktop: { x: 960, y: 520, h: 560 },
            mobile: { x: 195, y: 422, h: 200 },
            enter: "depth",
            exit: "left",
          },
        ],
      },
      // 11 — What happens next
      {
        blocks: [
          {
            kind: "text",
            title: "What happens next",
            paragraphs: [
              "The eight participants are now out taking their five photos each.",
              "We've been invited back to KYP in January 2027 to see what they made of their town.",
            ],
            desktop: { w: 665 },
            mobile: MOBILE_TEXT,
            enter: "depth",
            exit: "bottom",
          },
        ],
      },
    ],
  },
  {
    background: SPRINGHILL_BACKGROUND,
    slug: "springhill-hospice",
    client: "Springhill Hospice",
    title: "Springhill Hospice",
    category: "Second Cut (Her words)",
    scenes: [
      // 1 — Second Cut (Her words)
      {
        blocks: [
          {
            kind: "text",
            title: "Second Cut (Her words)",
            paragraphs: [
              "The same footage and the same photos, with a granddaughter's story finally given room to breathe.",
            ],
            desktop: { w: 665 },
            mobile: MOBILE_TEXT,
            enter: "depth",
            exit: "bottom",
          },
        ],
      },
      // 2 — Springhill Hospice logo
      {
        blocks: [
          {
            kind: "image",
            src: `${SPRINGHILL}/logos/springhill-hospice-logo.svg`,
            alt: "Springhill Hospice — Making every moment count",
            desktop: { x: 960, y: 540, h: 300 },
            mobile: { x: 195, y: 422, h: 140 },
            enter: "depth",
            exit: "left",
          },
        ],
      },
      // 3 — The Brief
      {
        blocks: [
          {
            kind: "text",
            title: "The Brief",
            paragraphs: [
              "Everything was already there: the interview and a set of family photographs.",
              "The hospice's marketing team had filmed and cut it themselves. They knew the edit didn't yet carry what she was really saying, and asked us to bring the family's story through more truthfully.",
            ],
            desktop: { w: 665 },
            mobile: MOBILE_TEXT,
            enter: "depth",
            exit: "bottom",
          },
        ],
      },
      // 4 — What we did
      {
        blocks: [
          {
            kind: "text",
            title: "What we did",
            paragraphs: [
              "We watched the full interview from start to finish before cutting a single frame, listening for the moments where she spoke most openly.",
              "Added the photography in the most appropriate places, editing and paused where was appropriate and added music to match the tone.",
            ],
            desktop: { w: 665 },
            mobile: MOBILE_TEXT,
            enter: "depth",
            exit: "bottom",
          },
        ],
      },
      // 5 — The film (poster = the granddaughter with her grandfather); plays with sound while
      // in front, muted as it leaves
      {
        blocks: [
          {
            kind: "video",
            frame: "browser",
            url: "Second Cut — Her words",
            poster: `${SPRINGHILL}/posters/second-cut.jpg`,
            src: "https://res.cloudinary.com/aeh9u82k/video/upload/v1794580662/Springhill_hospice_video-compressed.mp4",
            desktop: { x: 960, y: 520, h: 600 },
            mobile: { x: 195, y: 422, h: 220 },
            enter: "depth",
            exit: "left",
          },
        ],
      },
      // 6 — The Outcome
      {
        blocks: [
          {
            kind: "text",
            title: "The Outcome",
            paragraphs: [
              "Our edited video was shared at a charity ball and we were told evoked the emotions they had hoped for.",
            ],
            desktop: { w: 665 },
            mobile: MOBILE_TEXT,
            enter: "depth",
            exit: "bottom",
          },
        ],
      },
    ],
  },
];

export const caseStudyAnchor = (slug: string) => `case-${slug}`;

export const paragraphText = (paragraph: Paragraph) =>
  typeof paragraph === "string"
    ? paragraph
    : `${paragraph.marker ? `${paragraph.marker} ` : ""}${paragraph.lead ?? ""}${paragraph.text}`;

/** The video on the very first screen, if any — the preloader waits for it. */
export const firstScreenVideo = () => {
  const block = caseStudies[0]?.scenes[0]?.blocks.find((b) => b.kind === "video");
  return block?.kind === "video" ? block.src : undefined;
};
