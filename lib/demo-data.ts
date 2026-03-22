import type { Gallery } from "@/types/memora";

const now = "2026-03-22T12:00:00.000Z";

function buildPhotoSet(
  subgalleryId: string,
  prefix: string,
  images: string[],
  captions: string[],
) {
  return images.map((src, index) => ({
    id: `${prefix}-photo-${index + 1}`,
    subgalleryId,
    src,
    caption: captions[index] ?? "",
    createdAt: now,
    order: index,
  }));
}

export const demoGalleries: Gallery[] = [
  {
    id: "gallery-switzerland",
    title: "Switzerland & Northern Italy",
    coverImage: "/demo/alpine-dawn.svg",
    description:
      "A soft braid of mountain air, windowside train hours, and lakeside dinners that made the whole trip feel like a keepsake unfolding chapter by chapter.",
    startDate: "2026-02-11",
    endDate: "2026-02-19",
    locations: ["Zermatt", "Livigno", "Lake Como", "Zurich"],
    people: ["Maya", "Elias"],
    moodTags: ["Quiet luxury", "Snow light", "Train days"],
    privacy: "private",
    createdAt: now,
    updatedAt: now,
    subgalleries: [
      {
        id: "sub-zermatt",
        galleryId: "gallery-switzerland",
        title: "Zermatt",
        coverImage: "/demo/alpine-village.png",
        location: "Zermatt, Switzerland",
        dateLabel: "Feb 11-13",
        description:
          "Early blue hours, cedar interiors, and the mountain appearing and disappearing behind weather like it was keeping a secret.",
        photos: buildPhotoSet(
          "sub-zermatt",
          "zermatt",
          ["/demo/alpine-village.png", "/demo/mountain-window.svg", "/demo/mist-lake.svg"],
          ["Morning over the ridgeline", "The hotel window after snowfall", "A pause before dinner"],
        ),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "sub-train-livigno",
        galleryId: "gallery-switzerland",
        title: "Train to Livigno",
        coverImage: "/demo/train-livigno.png",
        location: "Bernina route",
        dateLabel: "Feb 14",
        description:
          "A full day of passing white silence, polished wood stations, and small details that made the journey feel more memorable than the destination.",
        photos: buildPhotoSet(
          "sub-train-livigno",
          "livigno",
          ["/demo/train-livigno.png", "/demo/frosted-platform.svg", "/demo/ink-evening.svg"],
          ["Windows full of drifting light", "One quiet stop between peaks", "Ink-blue dusk at arrival"],
        ),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "sub-lake-como",
        galleryId: "gallery-switzerland",
        title: "Lake Como",
        coverImage: "/demo/lake-como.png",
        location: "Lake Como, Italy",
        dateLabel: "Feb 15-17",
        description:
          "Stone stairs, soft water, and villas half hidden behind winter gardens. Everything felt slower here, like the trip exhaled.",
        photos: buildPhotoSet(
          "sub-lake-como",
          "como",
          ["/demo/lake-como.png", "/demo/courtyard-noon.svg", "/demo/mist-lake.svg"],
          ["Breakfast facing the water", "Stillness in the courtyard", "Late light on the lake"],
        ),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "sub-zurich",
        galleryId: "gallery-switzerland",
        title: "Zurich",
        coverImage: "/demo/zurich.png",
        location: "Zurich, Switzerland",
        dateLabel: "Feb 18-19",
        description:
          "The last pages of the trip: blue tram reflections, bookstores, a final long lunch, and that strange feeling of wanting to stay inside the memory a little longer.",
        photos: buildPhotoSet(
          "sub-zurich",
          "zurich",
          ["/demo/zurich.png", "/demo/paper-morning.svg", "/demo/ink-evening.svg"],
          ["Blue hour by the river", "A slow cafe morning", "The city after dinner"],
        ),
        createdAt: now,
        updatedAt: now,
      },
    ],
  },
  {
    id: "gallery-andalusia",
    title: "Andalusia Day Trips",
    coverImage: "/demo/stone-arch.svg",
    description:
      "A collection of shorter escapes around southern Spain, each one small enough to hold in one hand and vivid enough to revisit often.",
    startDate: "2025-09-04",
    endDate: "2025-09-22",
    locations: ["Granada", "Córdoba", "Ronda"],
    people: ["Lucia", "Andres", "Nina"],
    moodTags: ["Golden stone", "Late summer", "Daylight walks"],
    privacy: "public",
    createdAt: now,
    updatedAt: now,
    subgalleries: [
      {
        id: "sub-cahorros",
        galleryId: "gallery-andalusia",
        title: "Los Cahorros",
        coverImage: "/demo/stone-arch.svg",
        location: "Monachil, Granada",
        dateLabel: "September 4",
        description:
          "Hanging bridges, limestone walls, and shade that made the afternoon feel cool even when summer was still holding on.",
        photos: buildPhotoSet(
          "sub-cahorros",
          "cahorros",
          ["/demo/stone-arch.svg", "/demo/courtyard-noon.svg", "/demo/paper-morning.svg"],
          ["Trail light at the entrance", "A rest in the shade", "The path opening up"],
        ),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "sub-albaicin",
        galleryId: "gallery-andalusia",
        title: "Albaicin Sunset",
        coverImage: "/demo/terrace-sunset.svg",
        location: "Granada, Spain",
        dateLabel: "September 10",
        description:
          "White walls warming into peach, quiet stairways, and the Alhambra glowing across the hill as the evening settled in.",
        photos: buildPhotoSet(
          "sub-albaicin",
          "albaicin",
          ["/demo/terrace-sunset.svg", "/demo/paper-morning.svg", "/demo/ink-evening.svg"],
          ["First view from the mirador", "Notes from the cafe", "Blue light on the way back"],
        ),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "sub-cordoba",
        galleryId: "gallery-andalusia",
        title: "Cordoba",
        coverImage: "/demo/courtyard-noon.svg",
        location: "Córdoba, Spain",
        dateLabel: "September 16",
        description:
          "Courtyards, tiled shadows, and the kind of midday brightness that makes every doorway feel cinematic.",
        photos: buildPhotoSet(
          "sub-cordoba",
          "cordoba",
          ["/demo/courtyard-noon.svg", "/demo/stone-arch.svg", "/demo/terrace-sunset.svg"],
          ["The first courtyard", "Arches after lunch", "Golden hour beginning"],
        ),
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "sub-ronda",
        galleryId: "gallery-andalusia",
        title: "Ronda",
        coverImage: "/demo/mountain-window.svg",
        location: "Ronda, Spain",
        dateLabel: "September 22",
        description:
          "Cliffside viewpoints, deep shadows, and the feeling that the whole town had been suspended for dramatic effect.",
        photos: buildPhotoSet(
          "sub-ronda",
          "ronda",
          ["/demo/mountain-window.svg", "/demo/mist-lake.svg", "/demo/terrace-sunset.svg"],
          ["Wind across the gorge", "A quieter lane nearby", "Evening colors on stone"],
        ),
        createdAt: now,
        updatedAt: now,
      },
    ],
  },
];
