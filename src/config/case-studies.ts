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
export type Paragraph =
  | string
  | {
      text: string;
      lead?: string;
      marker?: string;
      /** Phrases inside `text` drawn in semi-bold (e.g. a quoted name), each at its first match. */
      bold?: string[];
    };

export type TextBlock = Motion & {
  kind: "text";
  /** Bold title, followed by blank line(s) before the paragraphs. */
  title?: string;
  /** Blank lines between the title and the first paragraph (default 1). */
  titleGap?: number;
  /**
   * "heading" (default): a section heading — shown in capitals, 24px bold, 10.08px tracking
   * (Figma "THE SPARK"). "statement": an opening line shown as written (no capitals, normal tracking).
   */
  titleStyle?: "heading" | "statement";
  /** Title size as a multiple of the paragraph size, e.g. 32 / 24 for a 32px title over 24px text. */
  titleScale?: number;
  /** Title line height as a multiple of its own font size (default: same as the paragraphs). */
  titleLeading?: number;
  /** Title letter spacing as a share of its own font size, e.g. 4.8 / 32 (default: standard / heading). */
  titleTracking?: number;
  /** Paragraph letter spacing as a share of the font size, e.g. 2.4 / 24 (default: the standard 5.52px). */
  tracking?: number;
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
  /**
   * Fly-through: the text types itself out letter by letter as the camera approaches, and
   * un-types in reverse as it leaves (tied to scroll). Best for a single short line.
   */
  typewriter?: boolean;
  /**
   * A hand-drawn doodle arrow starting just after the end of the line and curling down to the
   * right (e.g. towards a video below). With `typewriter`, it appears once the typing finishes.
   */
  pointer?: boolean;
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
  /** Frames "flat" / "browser": a soft, slowly pulsing brand-pink glow behind it, to draw the eye. */
  highlight?: boolean;
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
    lead: "THE WHY | ",
    text: "David and Dean's Rochdale: the street, the school, the band, the first home, the struggles first time buyers face, the FGTC movement.",
  },
  { lead: "THE TEASER | ", text: '"Rochdale, we\'ve been thinking about first-time buyers."' },
  { lead: "THE LAUNCH | ", text: "A hero film, registration opens, and a live counter as places fill." },
  { lead: "THE PROOF | ", text: "The first buyers coming through, in their own words." },
  {
    lead: "THE OPEN DOOR | ",
    text: "The first keys handed over, and other Rochdale businesses invited to fund the next hundred.",
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
            titleStyle: "statement",
            // Figma (updated): title 32px / 700, line-height 50px, 7.36px tracking; body stays the
            // standard 24px / 400, 33px, 5.52px. Text box 836px wide.
            titleScale: 32 / 24,
            titleLeading: 50 / 32,
            // Figma (updated): title 4.8px tracking; body 24px / 400, 33px, 2.4px tracking. Box 836px.
            titleTracking: 4.8 / 32,
            tracking: 2.4 / 24,
            titleGap: 1.6,
            paragraphs: [
              "This is story of two Rochdale lads, born and bred in the town, who once played in a band in the old mills & now run a law firm here.",
            ],
            desktop: { w: 836 },
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
            // Figma (updated): title 32px / 700, line-height 33px, 4.8px tracking (capitals); body 24px /
            // 400, 33px, 2.4px tracking. Text box 700px wide, content centred vertically.
            titleScale: 32 / 24,
            titleLeading: 33 / 32,
            titleTracking: 4.8 / 32,
            tracking: 2.4 / 24,
            paragraphs: [
              "Dean and David grew up in Rochdale, went to school in Rochdale, even played in a band together in Rochdale.",
              "Today they run HY Group, which includes HY Solicitors, HY Education and HY Conveyancing.",
              {
                text: "They’d watched the ‘For Generations To Come’ movement inspire people across the borough asking what they could do for the next generation.",
                bold: ["‘For Generations To Come’"],
              },
              { text: "Their answer - ‘The Rochdale Hundred’.", bold: ["‘The Rochdale Hundred’"] },
              "In 2027, HY will be offering to cover the legal fees for 100 first-time purchasing buying their first home in the borough.",
            ],
            // Figma: 700px text box.
            desktop: { w: 700 },
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
            // Figma (updated): title 32px / 700, line-height 33px, 4.8px tracking (capitals); body 24px /
            // 400, 33px, 2.4px tracking. Text box 656px wide, content centred vertically.
            titleScale: 32 / 24,
            titleLeading: 33 / 32,
            titleTracking: 4.8 / 32,
            tracking: 2.4 / 24,
            paragraphs: [
              "A law firm offering to pay legal fees is a press release waiting to go wrong.",
              "Do it loudly and it looks like a promotion dressed up as kindness.",
              "We all recognised that risk from the offer, and didn't want that misconception to cloud the genuine nature of the offer.",
              "So we set one rule for every frame: the firm is never the hero. Rochdale's first-time buyers and the town itself are. HY are just one of the hands helping out, and the only line they ever say is \"this is simply doing our bit.\"",
            ],
            desktop: { w: 656 },
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
            src: "https://res.cloudinary.com/aeh9u82k/video/upload/c_limit,w_1280,h_1280,fps_30,q_auto/v1793105014/1._David_-_My_Town_Intro.mp4",
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
            // Figma (updated): title 32px / 700, line-height 33px, 4.8px tracking (capitals); body 24px /
            // 400, 33px, 2.4px tracking. Text box 831px wide, content centred vertically.
            titleScale: 32 / 24,
            titleLeading: 33 / 32,
            titleTracking: 4.8 / 32,
            tracking: 2.4 / 24,
            paragraphs: [
              "Before a camera came out, we talked the story through with the team, so the initiative would be reflected properly. That shaped three choices.",
              {
                lead: "THE WHOLE BOROUGH | ",
                text: "Heywood, Middleton, Littleborough and Milnrow appear alongside the town centre, so nobody feels it's only about one postcode.",
              },
              {
                lead: "REAL VOICES | ",
                text: "We interview first-time buyers and their parents about what buying a home costs now compared with thirty years ago. Every contributor chooses how they appear: on camera, voice only, or anonymised.",
              },
              {
                lead: "EARNED NOT BOUGHT | ",
                text: "Any press comes because the cause is worth a story, not because HY paid for space.",
              },
            ],
            desktop: { w: 831 },
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
            src: "https://res.cloudinary.com/aeh9u82k/video/upload/c_limit,w_1280,h_1280,fps_30,q_auto/v1793105372/2._Dean_-_My_Town_Intro.mp4",
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
            // Figma (updated): title 32px / 700, line-height 33px, 4.8px tracking (capitals); body 24px /
            // 400, 33px, 2.4px tracking. Text box 959px wide, content centred vertically.
            titleScale: 32 / 24,
            titleLeading: 33 / 32,
            titleTracking: 4.8 / 32,
            tracking: 2.4 / 24,
            paragraphs: FIVE_CHAPTERS,
            desktop: { w: 959 },
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
            // Figma (updated): title 32px / 700, line-height 33px, 4.8px tracking (capitals); body 24px /
            // 400, 33px, 2.4px tracking. Text box 959px wide, content centred vertically.
            titleScale: 32 / 24,
            titleLeading: 33 / 32,
            titleTracking: 4.8 / 32,
            tracking: 2.4 / 24,
            paragraphs: [
              "We shot it documentary-style on a mobile because this story was always meant to be told on social media, and the format needed to match the delivery vehicle. We used a drone and shot B-roll of famous landscapes and characteristics of the town to supplement the personal story of those being featured.",
              "Every film is cut for Facebook, Instagram and TikTok, with captions burned in, because most people scroll with the sound off.",
              "A planned \"Then & Now\" film pairs an older Rochdale homeowner with a first-time buyer over a brew in a kitchen.",
            ],
            desktop: { w: 959 },
            mobile: MOBILE_TEXT,
            enter: "top-left",
            exit: "bottom",
            fx: "auto",
            fxOut: "auto",
          },
        ],
      },
      // 11–13 — Behind the scenes, one by one: the line stays in the middle while the kitchen
      // (left), the café (right) and the road (left) each arrive on their own slide, emerging from
      // deep inside, and open out to their own side as the next one comes. Flat, muted, no sound button.
      {
        pace: 0.6,
        blocks: [
          {
            kind: "text",
            // Caption among the images: heading style (capitals, 24px bold, 10.08px tracking).
            title: "Behind the scenes",
            // Stays in the centre while the photos arrive, zooming in only lightly, just behind
            // them (they always cover it); leaves once the last photo is in.
            depth: 7,
            hold: 2.1,
            desktop: { w: 760 },
            mobile: { w: 342 },
            enter: "depth",
            exit: "bottom",
          },
          {
            kind: "video",
            frame: "flat",
            poster: `${HY}/posters/kitchen.jpg`,
            src: "https://res.cloudinary.com/aeh9u82k/video/upload/c_limit,w_1280,h_1280,fps_30,q_auto/v1794579727/HY_video_5-compressed.mp4",
            sound: false,
            // Emerges from deep inside, fainter while far away.
            appear: -20,
            fade: 56,
            desktop: { x: 520, y: 480, h: 520 },
            mobile: { x: 195, y: 250, h: 240 },
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
            src: "https://res.cloudinary.com/aeh9u82k/video/upload/c_limit,w_1280,h_1280,fps_30,q_auto/v1794578952/HY_video_4-compressed.mp4",
            sound: false,
            appear: -20,
            fade: 56,
            desktop: { x: 1410, y: 600, h: 520 },
            mobile: { x: 195, y: 600, h: 240 },
            enter: "depth",
            exit: "right",
          },
        ],
      },
      {
        pace: 0.6,
        blocks: [
          {
            // Behind-the-scenes clip (IMG_4294, iPhone HDR → web copy 720x1280, 24fps, 3.3 MB).
            kind: "video",
            frame: "flat",
            poster: `${HY}/posters/street.jpg`,
            src: "/video/web/hy-conveyancing/street.mp4",
            sound: false,
            appear: -20,
            fade: 56,
            desktop: { x: 520, y: 500, h: 520 },
            mobile: { x: 195, y: 260, h: 240 },
            enter: "depth",
            exit: "left",
          },
        ],
      },
      // 14 — The Result (Figma; replaces the repeat of the five chapters)
      {
        blocks: [
          {
            kind: "text",
            title: "The Result",
            // Figma (updated): title 32px / 700, line-height 33px, 4.8px tracking (capitals); body 24px /
            // 400, 33px, 2.4px tracking. Text box 959px wide, content centred vertically.
            titleScale: 32 / 24,
            titleLeading: 33 / 32,
            titleTracking: 4.8 / 32,
            tracking: 2.4 / 24,
            paragraphs: [
              "24 short videos have been created so far along with a marketing plan to launch the initiative to the borough in a way that fits with the tone and emotion behind it -",
              "A gesture from two Rochdale lads who love their town.",
            ],
            desktop: { w: 959 },
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
            title: "For most of us, the 'About Us' page on a website just sits on a shelf, untouched. We took Grimm & Co's and made it a book you want to pick up and open...",
            titleStyle: "statement",
            // Figma (updated again): title 32px / 700, line-height 50px, 4.8px tracking; body 24px / 400,
            // 33px, 2.4px tracking. Text box 1113px wide (~107px from the title's last line to the body).
            titleScale: 32 / 24,
            titleLeading: 50 / 32,
            titleTracking: 4.8 / 32,
            tracking: 2.4 / 24,
            titleGap: 1.7,
            paragraphs: [
              "The Grimm & Co world is truly magical. We wanted to tell their magical tale properly in the digital world, to help them achieve their goals.",
            ],
            desktop: { w: 1113 },
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
            // Figma (updated): title 32px / 700, line-height 33px, 4.8px tracking (capitals); body 24px /
            // 400, 33px, 2.4px tracking. Text box 828px wide, content centred vertically.
            titleScale: 32 / 24,
            titleLeading: 33 / 32,
            titleTracking: 4.8 / 32,
            tracking: 2.4 / 24,
            paragraphs: [
              "Grimm & Co is a children's creative writing charity in Rotherham. Its home is an old church which has been turned into a magical haven for magical beings.",
              "The story goes that Graham Grimm has been helping magical folk replenish their magic since 1148 through the power of storytelling.",
              "Every part of the space has been designed to spark visitors imagination, from the shop counter to the staircase. Walk in, and you're inside Grimm's story before anyone has explained a thing.",
            ],
            desktop: { w: 828 },
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
            // Caption among the images: heading style (capitals, 24px bold, 10.08px tracking).
            title: "The Space",
            // Stays in the centre while the photos arrive, zooming in only lightly, just behind
            // them (they always cover it); leaves once the last photo is in.
            depth: 7,
            hold: 2.1,
            desktop: { w: 760 },
            mobile: { w: 342 },
            enter: "depth",
            exit: "bottom",
          },
          {
            kind: "image",
            src: `${GRIMM}/photos/space-v2-1.jpg`,
            alt: "Aerial view of the Grimm & Co church at golden hour",
            depth: 0,
            // Emerges from deep inside, the ones behind fainter.
            appear: -20,
            fade: 56,
            desktop: { x: 450, y: 470, h: 380 },
            mobile: { x: 195, y: 250, h: 200 },
            enter: "depth",
            exit: "left",
          },
          {
            kind: "image",
            src: `${GRIMM}/photos/space-v2-2.jpg`,
            alt: "Grimm & Co banners hanging in the old church hall beside the organ",
            // Half a step behind its left partner, so it arrives right after it.
            depth: 22,
            // Emerges from deep inside, the ones behind fainter.
            appear: -20,
            fade: 56,
            desktop: { x: 1470, y: 610, h: 340 },
            mobile: { x: 195, y: 600, h: 200 },
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
            src: `${GRIMM}/photos/space-v2-3.jpg`,
            alt: "The play area under fairy lights and the stained-glass window",
            depth: 0,
            // Emerges from deep inside, the ones behind fainter.
            appear: -20,
            fade: 56,
            desktop: { x: 450, y: 430, h: 320 },
            mobile: { x: 195, y: 260, h: 200 },
            enter: "depth",
            exit: "left",
          },
          {
            kind: "image",
            src: `${GRIMM}/photos/space-v2-4.jpg`,
            alt: "The Magic-o-meter and bookshelves in the Grimm & Co shop",
            // Half a step behind its left partner, so it arrives right after it.
            depth: 22,
            // Emerges from deep inside, the ones behind fainter.
            appear: -20,
            fade: 56,
            desktop: { x: 1470, y: 600, h: 400 },
            mobile: { x: 195, y: 590, h: 200 },
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
            src: `${GRIMM}/photos/space-v2-5.jpg`,
            alt: "Children in a writing workshop under the painted map ceiling",
            depth: 0,
            // Emerges from deep inside, the ones behind fainter.
            appear: -20,
            fade: 56,
            desktop: { x: 450, y: 500, h: 360 },
            mobile: { x: 195, y: 260, h: 200 },
            enter: "depth",
            exit: "left",
          },
          {
            kind: "image",
            src: `${GRIMM}/photos/space-v2-6.jpg`,
            alt: "Signposts to the Writers Pad, Everywherium and Back of Beyond",
            // Half a step behind its left partner, so it arrives right after it.
            depth: 22,
            // Emerges from deep inside, the ones behind fainter.
            appear: -20,
            fade: 56,
            desktop: { x: 1470, y: 560, h: 360 },
            mobile: { x: 195, y: 590, h: 200 },
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
            // Figma (updated): title 32px / 700, line-height 33px, 4.8px tracking (capitals); body 24px /
            // 400, 33px, 2.4px tracking. Text box 939px wide, content centred vertically.
            titleScale: 32 / 24,
            titleLeading: 33 / 32,
            titleTracking: 4.8 / 32,
            tracking: 2.4 / 24,
            paragraphs: [
              "Trying to explain the story of Grimm & Co., and trying to describe the wonder of their space is harder than trying to catch a boggart. In the digital realm, their story had been lost in a labyrinth of pages and reams of text.",
              "It had grown into a complicated, uninspiring experience, the complete opposite to their Emporium of Stories.",
              "Somebody finding Grimm online for the first time had no sense of the magic waiting for them, and therefore much less reason to visit.",
              "We wanted to put that right. We wanted their story to be clear, to be celebrated and to be enjoyed.",
            ],
            desktop: { w: 939 },
            mobile: MOBILE_TEXT,
            enter: "top",
            exit: "bottom-right",
            fx: "stretch",
            fxOut: "auto",
          },
        ],
      },
      // 6 — The old website (Grimm video 1, a silent screen recording, in a browser window),
      // with "Watch this unfold" top-left (Figma).
      {
        blocks: [
          {
            kind: "text",
            // Figma: section-heading style (24px / 700, 10.08px tracking, capitals).
            title: "WATCH THIS UNFOLD",
            // Doodle arrow after the line, curling down to the window (lands once the typing ends).
            pointer: true,
            // Types itself out as the camera approaches, un-types as it passes (longer fade = slower typing).
            typewriter: true,
            fade: 24,
            // Figma: starts out to the left of the browser window (~203px left of its edge) and sits
            // ~62px above it (window at rest: ~1060x587 centred, top-left ~(430, 218); phone ~(23, 315)).
            desktop: { x: 227, y: 156, w: 700 },
            mobile: { x: 23, y: 287, w: 342 },
            enter: "top-left",
            exit: "right",
            fx: "auto",
            fxOut: "auto",
          },
          {
            kind: "video",
            frame: "browser",
            url: "grimmandco.co.uk",
            // Soft pulsing pink glow behind the window, so the eye goes to the video.
            highlight: true,
            poster: `${GRIMM}/posters/website.jpg`,
            src: "https://res.cloudinary.com/aeh9u82k/video/upload/c_limit,w_1280,h_1280,fps_30,q_auto/v1794577702/Grimm_video_1.mp4",
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
            // Figma (updated): title 32px / 700, line-height 33px, 4.8px tracking (capitals); body 24px /
            // 400, 33px, 2.4px tracking (quoted names 600). Text box 915px wide, content centred vertically.
            titleScale: 32 / 24,
            titleLeading: 33 / 32,
            titleTracking: 4.8 / 32,
            tracking: 2.4 / 24,
            paragraphs: [
              "The building is the source of the story. The building and its secrets present wonder after wonder. If the space is where the magic lives, the website's job is to tantalise the taste buds. Give people a glimmer of the rewards that await if they choose to visit.",
              "So our plan is to take a physical feature of the building/story and make it the star of that section of the website. Allow people to have fun exploring and feel like they want to visit to see the real thing.",
              { text: "The concept we are sharing here is the 'Our Story' page in the 'About Us' section.", bold: ["'Our Story'", "'About Us'"] },
            ],
            desktop: { w: 915 },
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
            // Figma (updated): title 32px / 700, line-height 33px, 4.8px tracking (capitals); body 24px /
            // 400, 33px, 2.4px tracking. Text box 1245px wide, content centred vertically.
            titleScale: 32 / 24,
            titleLeading: 33 / 32,
            titleTracking: 4.8 / 32,
            tracking: 2.4 / 24,
            paragraphs: [
              "A staircase connects the building's two floors. This staircase is designed to look like a giant bookcase, with famous children's books for people to find. This 'giant' bookcase also features in the Graham Grimm story, so it is not only a fun feature, but it also carries significance in the origin story.",
              "If Grimm & Co wanted to tell someone about their story in the digital world i.e. on their website, it made perfect sense, for a literacy charity, to have it written in a book. If they happen to have a giant bookcase on site, it also made perfect sense that the website user could take that book out of the bookcase to read it for themselves, and so formed our idea.",
              "We used chapters you can flick between, allowing Grimm & Co to tell their story in full without the reader feeling overwhelmed by loads of text on the page.",
              "We used a real image of the staircase so users feel like they're experiencing some of the building's physical magic. Then, when they are recommending it to others, they no longer need to spend 6 hours desperately trying to explain the impossible. Instead, they can show that person this page, and it does all the heavy lifting for them.",
            ],
            desktop: { w: 1245 },
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
            // Appears first (small, the whole line visible), before the background, then zooms
            // up as you scroll. Fully in at ~42 units from the camera.
            appear: 8,
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
            // Client's final artwork (Figma "Wide-1920-Our-Story"), compressed copy of our-story-final.jpg.
            src: `${GRIMM}/photos/our-story-final-web.jpg`,
            alt: "OUR STORY title art on aged parchment, signed by Grimm",
            backdrop: true,
            depth: 60,
            // Held back so it blends in after the text: fades in from ~33 to ~23 units away
            // (just as the slide reaches the reading point).
            appear: 12,
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
        // Starts further back than usual, so once the OUR STORY background has cleared the
        // first screens are still far off and zoom in from the distance (instead of popping in).
        gap: 1.6,
        blocks: [
          {
            kind: "text",
            // Caption among the images: heading style (capitals, 24px bold, 10.08px tracking).
            title: "screen by screen",
            // Centre caption held for all eight screens, just behind them; appears after the
            // OUR STORY background has cleared.
            depth: 7,
            hold: 3.6,
            appear: 26,
            desktop: { w: 760 },
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
            // Figma (updated): title 32px / 700, line-height 33px, 4.8px tracking (capitals); body 24px /
            // 400, 33px, 2.4px tracking. Text box 663px wide, content centred vertically.
            titleScale: 32 / 24,
            titleLeading: 33 / 32,
            titleTracking: 4.8 / 32,
            tracking: 2.4 / 24,
            paragraphs: ["Here is what happened when we put all of that together..."],
            desktop: { w: 663 },
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
            kind: "text",
            // Same cue as the Grimm website slide: heading style, typewriter, doodle arrow to the video.
            title: "WATCH THIS UNFOLD",
            pointer: true,
            typewriter: true,
            fade: 24,
            // Window ~1298x771, top-left ~(304, 160); phone ~(19, 305).
            desktop: { x: 101, y: 98, w: 700 },
            mobile: { x: 23, y: 277, w: 342 },
            enter: "depth",
            exit: "bottom",
          },
          {
            kind: "video",
            frame: "browser",
            url: "grimmandco.co.uk/our-story",
            // Soft pulsing pink glow behind the window, so the eye goes to the video.
            highlight: true,
            poster: `${GRIMM}/posters/our-story.jpg`,
            // Local: web copy (1280x708, 30fps, 3.8 MB) of public/video/grimm-nd-co-last.mp4.
            src: "/video/web/grimm-and-co/our-story-page.mp4",
            sound: false,
            desktop: { x: 953, y: 545, h: 700 },
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
            titleStyle: "statement",
            // Figma (updated): title 32px / 700, line-height 50px, 4.8px tracking; body 24px / 400, 33px,
            // 2.4px tracking. Text box 998px wide, content centred vertically; tight gap under the title.
            titleScale: 32 / 24,
            titleLeading: 50 / 32,
            titleTracking: 4.8 / 32,
            tracking: 2.4 / 24,
            titleGap: 0.6,
            paragraphs: [
              "Showing the future generation how to tell their own story through the power of a photo, and then step out of the shot.",
            ],
            desktop: { w: 998 },
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
            // Figma (updated): title 32px / 700, line-height 33px, 4.8px tracking (capitals); body 24px /
            // 400, 33px, 2.4px tracking. Text box 1019px wide, content centred vertically.
            titleScale: 32 / 24,
            titleLeading: 33 / 32,
            titleTracking: 4.8 / 32,
            tracking: 2.4 / 24,
            paragraphs: [
              "The University of Glasgow's Social Science department is researching how young people in Rochdale feel about their town and future job opportunities. Rather than handing them a boring survey, they’ve used a method called Photovoice, which asks them to tell their stories through photography.",
              "Their young volunteer's task is to take 5 photos that tell their story and how they feel. Our task was to equip them with some photography skills and knowledge that will help them to achieve this goal.",
              "The training session was held at the KYP's (Kashmir Youth Project) building. They had partnered with them to help access South Asian and other ethnically diverse communities in the area. KYP have been working with these communities since 1979.",
              "Eight young volunteers participated. Each has a week to take their photos.",
            ],
            desktop: { w: 1019 },
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
            // Figma (updated): title 32px / 700, line-height 33px, 4.8px tracking (capitals); body 24px /
            // 400, 33px, 2.4px tracking. Text box 945px wide, content centred vertically.
            titleScale: 32 / 24,
            titleLeading: 33 / 32,
            titleTracking: 4.8 / 32,
            tracking: 2.4 / 24,
            paragraphs: [
              "PhotoVoice is storytelling with a camera. Each photo and its caption tells a small piece of someone's life, and five together make a story nobody else could have told.",
              "The University didn't want great photographers. They wanted young people confident enough to tell that story their own way. So the brief was a short, informal session teaching them practical photography techniques to help enhance their storytelling skills.",
            ],
            desktop: { w: 945 },
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
            // Figma (updated): title 32px / 700, line-height 33px, 4.8px tracking (capitals); body 24px /
            // 400, 33px, 2.4px tracking. Text box 1049px wide, content centred vertically.
            titleScale: 32 / 24,
            titleLeading: 33 / 32,
            titleTracking: 4.8 / 32,
            tracking: 2.4 / 24,
            paragraphs: [
              "We provide a 1.5-hour practical training session. We explained how capturing the same picture/setting in different ways completely changed the story's narrative.",
              "It ran in six short parts, each followed straight away by a challenge to give them the chance to put their newly learned skills into practice.",
              "Every participant received the presentation and a set of supplemental notes, ready to take on their challenge.",
              "The entire session focused on participants using their own mobile phones. No need to spend a fortune on fancy equipment. The power to tell their story was right there, in their own pocket.",
              "We hoped not only to empower participants with the skills to better tell their own story, but also to leave them with a practical skill they could take into the job market.",
            ],
            desktop: { w: 1049 },
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
            kind: "text",
            // Same cue as the Grimm website slide: heading style, typewriter, doodle arrow to the video.
            title: "WATCH THIS UNFOLD",
            pointer: true,
            typewriter: true,
            fade: 24,
            // Window ~905x609 (16:10 video), top-left ~(508, 215); phone ~(33, 313).
            desktop: { x: 305, y: 153, w: 700 },
            mobile: { x: 33, y: 285, w: 342 },
            enter: "depth",
            exit: "left",
          },
          {
            kind: "video",
            frame: "browser",
            url: "Phone Photography — KYP session",
            // Soft pulsing pink glow behind the window, so the eye goes to the video.
            highlight: true,
            poster: `${KYP}/posters/phone-photography.jpg`,
            // Local: web copy (1280x800, 30fps, 5.2 MB) of public/video/KYP.mp4.
            src: "/video/web/kyp/phone-photography-session.mp4",
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
            // Figma (updated): title 32px / 700, line-height 33px, 4.8px tracking (capitals); body 24px /
            // 400, 33px, 2.4px tracking. Text box 797px wide, content centred vertically.
            titleScale: 32 / 24,
            titleLeading: 33 / 32,
            titleTracking: 4.8 / 32,
            tracking: 2.4 / 24,
            paragraphs: [
              "The eight participants are now out taking their five photos each.",
              "We've been invited back to KYP in January 2027 to see what they made of their town.",
            ],
            desktop: { w: 797 },
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
      // 1 — Take #2 (opening)
      {
        blocks: [
          {
            kind: "text",
            title: "Take #2",
            titleStyle: "statement",
            // Figma (updated): title 32px / 700, line-height 33px, 4.8px tracking (as written, no capitals);
            // body 24px / 400, 33px, 2.4px tracking. Text box 885px wide, content centred vertically.
            titleScale: 32 / 24,
            titleLeading: 33 / 32,
            titleTracking: 4.8 / 32,
            tracking: 2.4 / 24,
            titleGap: 1.2,
            paragraphs: ["The same footage, the same photos, the same story, just told in a different way."],
            desktop: { w: 885 },
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
            // Figma (updated): title 32px / 700, line-height 33px, 4.8px tracking (capitals); body 24px /
            // 400, 33px, 2.4px tracking. Text box 1081px wide, content centred vertically.
            titleScale: 32 / 24,
            titleLeading: 33 / 32,
            titleTracking: 4.8 / 32,
            tracking: 2.4 / 24,
            paragraphs: [
              "Everything was already there: the interview and a set of family photographs.",
              "The hospice's marketing team had filmed and cut it themselves.",
              "The team felt the final version didn't convey the story's emotional weight well enough. They needed it to convey the tale's sadness and the hope the hospice's support brought. The video was to be shown at a major fundraising event, so it needed to provoke a response that would make people more likely to donate and/or support the charity.",
            ],
            desktop: { w: 1081 },
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
            // Figma (updated): title 32px / 700, line-height 33px, 4.8px tracking (capitals); body 24px /
            // 400, 33px, 2.4px tracking. Text box 926px wide, content centred vertically.
            titleScale: 32 / 24,
            titleLeading: 33 / 32,
            titleTracking: 4.8 / 32,
            tracking: 2.4 / 24,
            paragraphs: [
              "We watched the full interview from start to finish before cutting a single frame, listening for the key moments that better told the two stories - that of sadness and then of hope.",
              "We then re-edited everything from scratch, with the sole brief from the client.... 'make us cry'.",
            ],
            desktop: { w: 926 },
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
            kind: "text",
            // Same cue as the Grimm website slide: heading style, typewriter, doodle arrow to the video.
            title: "WATCH THIS UNFOLD",
            pointer: true,
            typewriter: true,
            fade: 24,
            // Window ~1078x659, top-left ~(421, 191); phone ~(0, 301).
            desktop: { x: 218, y: 129, w: 700 },
            mobile: { x: 23, y: 273, w: 342 },
            enter: "depth",
            exit: "left",
          },
          {
            kind: "video",
            frame: "browser",
            url: "Second Cut — Her words",
            // Soft pulsing pink glow behind the window, so the eye goes to the video.
            highlight: true,
            poster: `${SPRINGHILL}/posters/second-cut.jpg`,
            src: "https://res.cloudinary.com/aeh9u82k/video/upload/c_limit,w_1280,h_1280,fps_30,q_auto/v1794580662/Springhill_hospice_video-compressed.mp4",
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
            // Figma (updated): title 32px / 700, line-height 33px, 4.8px tracking (capitals); body 24px /
            // 400, 33px, 2.4px tracking. Text box 917px wide, content centred vertically.
            titleScale: 32 / 24,
            titleLeading: 33 / 32,
            titleTracking: 4.8 / 32,
            tracking: 2.4 / 24,
            paragraphs: [
              "We were successful in 'making them cry' and so the video was shown at the fundraising ball to evoke the emotions they needed.",
            ],
            desktop: { w: 917 },
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
