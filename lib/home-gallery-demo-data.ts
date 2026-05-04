/**
 * Home gallery demo data
 * ---------------------------------------------------------------------------
 * Single source of truth for the homepage gallery-reveal section. Edit
 * titles, descriptions, captions, and image filenames here. Image paths
 * resolve to files in `public/demo/home-gallery/`.
 *
 * Structure:
 *   Gallery → 3 subgalleries → 3 scenes each (9 total)
 *
 * Replacing images:
 *   Drop files into public/demo/home-gallery/ with the exact filenames
 *   referenced below. Until a file is present, the UI renders a soft
 *   neutral placeholder.
 */

export type DemoScene = {
  id: string;
  image: string;
  title?: string;
  caption?: string;
};

export type DemoSubgallery = {
  id: string;
  title: string;
  location: string;
  dates?: string;
  description: string;
  coverImage: string;
  scenes: DemoScene[];
};

export type DemoGallery = {
  title: string;
  location: string;
  dates: string;
  description: string;
  coverImage: string;
  subgalleries: DemoSubgallery[];
};

const DIR = "/demo/home-gallery";

export const HOME_GALLERY_DEMO: DemoGallery = {
  title: "Semester Abroad in Granada",
  location: "Granada, Spain",
  dates: "Jan 2026 – May 2026",
  description:
    "While I was based in Granada, I spent a lot of time exploring southern Spain, and wanted to dedicate a gallery to the region. Some of these trips include Sevilla, Córdoba, Málaga, Cádiz, and Gibraltar.",
  coverImage: `${DIR}/gallery-cover.jpg`,
  subgalleries: [
    {
      id: "sub-1",
      title: "Mountain biking in Granada",
      location: "Granada",
      dates: "Jan 2026 – May 2026",
      description:
        "Take a look at some of my mountain biking adventures around Granada!",
      coverImage: `${DIR}/subgallery-1-cover.jpg`,
      scenes: [
        {
          id: "s1-1",
          image: `${DIR}/scene-1-1.jpg`,
          caption:
            "This was one of my first rides. I hope I never forget the awe I felt when I first saw the city from above.",
        },
        {
          id: "s1-2",
          image: `${DIR}/scene-1-2.jpg`,
          caption:
            "Met this Granadino named Marco and he showed me a completely new route!",
        },
        {
          id: "s1-3",
          image: `${DIR}/scene-1-3.jpg`,
          caption: "First time showing Eli the panoramic view above the Alhambra!",
        },
        {
          id: "s1-4",
          image: `${DIR}/scene-1-4.jpg`,
          caption:
            "Don't be fooled by her confident posing, this was shortly after I carried her bike up the hill.",
        },
      ],
    },
    {
      id: "sub-2",
      title: "Day trip to Gibraltar",
      location: "Gibraltar",
      dates: "Sat, Apr 18, 2026",
      description:
        "While we were excited to see the monkeys, they were just excited to steal our stuff. See below!",
      coverImage: `${DIR}/subgallery-2-cover.jpg`,
      scenes: [
        {
          id: "s2-1",
          image: `${DIR}/scene-2-1.jpg`,
          title: "Scene one",
        },
        {
          id: "s2-2",
          image: `${DIR}/scene-2-2.jpg`,
          caption: "Eli and I thought this looked like a sharks head/nose.",
        },
        {
          id: "s2-3",
          image: `${DIR}/scene-2-3.jpg`,
          caption: "I'm very happy I ended up home with everything I came with.",
        },
        {
          id: "s2-4",
          image: `${DIR}/scene-2-4.jpg`,
          caption:
            "Eli and I watched these guys do parkour for a little too long...",
        },
      ],
    },
    {
      id: "sub-3",
      title: "Weekend trip to Sevilla",
      location: "Sevilla",
      dates: "Feb 2026",
      description:
        "Had a great weekend with my program in Sevilla.",
      coverImage: `${DIR}/subgallery-3-cover.jpg`,
      scenes: [
        {
          id: "s3-1",
          image: `${DIR}/scene-3-1.jpg`,
        },
        {
          id: "s3-2",
          image: `${DIR}/scene-3-2.jpg`,
          caption: "Our first luxury dessert in Spain. Worth it.",
        },
        {
          id: "s3-4",
          image: `${DIR}/scene-3-4.jpg`,
        },
        {
          id: "s3-3",
          image: `${DIR}/scene-3-3.jpg`,
          caption: "Got to sit by the Guadalquivir before heading home",
        },
      ],
    },
  ],
};
