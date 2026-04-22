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
  dates: string;
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
  title: "Gallery title goes here",
  location: "Location, Country",
  dates: "Month Year – Month Year",
  description:
    "A short, calm description of the gallery — what the trip or time period was, written in your own voice. One or two sentences works well.",
  coverImage: `${DIR}/gallery-cover.jpeg`,
  subgalleries: [
    {
      id: "sub-1",
      title: "First subgallery title",
      location: "Place one",
      dates: "Month Year",
      description:
        "A short paragraph about this chapter — why this stretch of the trip stood on its own.",
      coverImage: `${DIR}/subgallery-1-cover.jpeg`,
      scenes: [
        {
          id: "s1-1",
          image: `${DIR}/scene-1-1.jpeg`,
          title: "Scene one",
          caption:
            "A small caption can sit here — a single thought about the moment.",
        },
        {
          id: "s1-2",
          image: `${DIR}/scene-1-2.jpeg`,
          title: "Scene two",
        },
        {
          id: "s1-3",
          image: `${DIR}/scene-1-3.jpeg`,
          title: "Scene three",
          caption: "Another short note, only when it adds something.",
        },
      ],
    },
    {
      id: "sub-2",
      title: "Second subgallery title",
      location: "Place two",
      dates: "Month Year",
      description:
        "Another short paragraph — a different place, a different pace, but still part of the same gallery.",
      coverImage: `${DIR}/subgallery-2-cover.JPG`,
      scenes: [
        {
          id: "s2-1",
          image: `${DIR}/scene-2-1.jpeg`,
          title: "Scene one",
        },
        {
          id: "s2-2",
          image: `${DIR}/scene-2-2.jpeg`,
          title: "Scene two",
          caption: "A quiet line about this one.",
        },
        {
          id: "s2-3",
          image: `${DIR}/scene-2-3.jpeg`,
          title: "Scene three",
        },
      ],
    },
    {
      id: "sub-3",
      title: "Third subgallery title",
      location: "Place three",
      dates: "Month Year",
      description:
        "One more chapter — the closing stretch, or a detour, or a day that deserved its own page.",
      coverImage: `${DIR}/subgallery-3-cover.JPG`,
      scenes: [
        {
          id: "s3-1",
          image: `${DIR}/scene-3-1.JPG`,
          title: "Scene one",
          caption: "Captions are optional — leave them empty when a photo speaks for itself.",
        },
        {
          id: "s3-2",
          image: `${DIR}/scene-3-2.JPG`,
          title: "Scene two",
        },
        {
          id: "s3-3",
          image: `${DIR}/scene-3-3.JPG`,
          title: "Scene three",
          caption: "A final note to close the chapter.",
        },
      ],
    },
  ],
};
