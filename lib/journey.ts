import type { Gallery } from "@/types/memora";

export type JourneyStageId =
  | "beginning"
  | "explorer"
  | "collector"
  | "curator"
  | "storykeeper"
  | "archivist";

export type JourneyMilestoneType =
  | "galleries"
  | "scenes"
  | "moments"
  | "descriptions"
  | "places";

export type JourneyStats = {
  galleryCount: number;
  sceneCount: number;
  momentCount: number;
  describedMemoryCount: number;
  distinctPlacesCount: number;
};

export type JourneyStage = {
  id: JourneyStageId;
  name: string;
  minGalleries: number;
  maxGalleries: number | null;
  description: string;
  supportCopy: string;
};

export type JourneyMilestoneDefinition = {
  id: string;
  title: string;
  threshold: number;
  type: JourneyMilestoneType;
  supportingText: string;
  celebrate?: boolean;
};

export type ResolvedJourneyMilestone = JourneyMilestoneDefinition & {
  achieved: boolean;
  progressValue: number;
  achievedAtLabel: string | null;
};

export type JourneyLinePoint = {
  stage: JourneyStage;
  position: number;
  isCurrent: boolean;
  isNext: boolean;
};

export type JourneyLineModel = {
  currentStage: JourneyStage;
  nextStage: JourneyStage | null;
  points: JourneyLinePoint[];
  currentPosition: number;
  remainingToNextStage: number | null;
  progressLabel: string;
};

export const journeyStages: JourneyStage[] = [
  {
    id: "beginning",
    name: "Beginning",
    minGalleries: 0,
    maxGalleries: 0,
    description: "A first shape is forming. Your archive is waiting for its opening chapter.",
    supportCopy: "Every archive begins with a single preserved moment.",
  },
  {
    id: "explorer",
    name: "Explorer",
    minGalleries: 1,
    maxGalleries: 2,
    description: "Your memories are starting to gather into something intentional and lasting.",
    supportCopy: "Your archive is taking shape.",
  },
  {
    id: "collector",
    name: "Collector",
    minGalleries: 3,
    maxGalleries: 5,
    description: "Distinct chapters are beginning to sit beside each other, each with its own weight.",
    supportCopy: "Another chapter is being preserved.",
  },
  {
    id: "curator",
    name: "Curator",
    minGalleries: 6,
    maxGalleries: 10,
    description: "Your archive is becoming more than a record. It is becoming a composed body of memory.",
    supportCopy: "Your memories are beginning to form a story.",
  },
  {
    id: "storykeeper",
    name: "Storykeeper",
    minGalleries: 11,
    maxGalleries: 20,
    description: "A longer continuity is visible now. Your life is being gathered into a living archive.",
    supportCopy: "A life, quietly documented.",
  },
  {
    id: "archivist",
    name: "Archivist",
    minGalleries: 21,
    maxGalleries: null,
    description: "Your archive has breadth, texture, and continuity. Its shape will keep deepening over time.",
    supportCopy: "Your archive holds a remarkable span of memory.",
  },
];

export const journeyMilestones: JourneyMilestoneDefinition[] = [
  {
    id: "first-gallery",
    title: "Created your first gallery",
    threshold: 1,
    type: "galleries",
    supportingText: "The archive has begun.",
    celebrate: true,
  },
  {
    id: "five-galleries",
    title: "Reached 5 galleries",
    threshold: 5,
    type: "galleries",
    supportingText: "Distinct chapters are beginning to sit together.",
    celebrate: true,
  },
  {
    id: "ten-galleries",
    title: "Reached 10 galleries",
    threshold: 10,
    type: "galleries",
    supportingText: "Your archive is becoming a long-form story.",
    celebrate: true,
  },
  {
    id: "first-scene",
    title: "Added your first scene",
    threshold: 1,
    type: "scenes",
    supportingText: "A gallery has opened into meaningful moments.",
    celebrate: true,
  },
  {
    id: "ten-scenes",
    title: "Added 10 scenes",
    threshold: 10,
    type: "scenes",
    supportingText: "Your memories are gaining shape and texture.",
    celebrate: true,
  },
  {
    id: "twenty-five-moments",
    title: "Preserved 25 moments",
    threshold: 25,
    type: "moments",
    supportingText: "A richer thread of memory is now taking form.",
    celebrate: true,
  },
  {
    id: "one-hundred-moments",
    title: "Preserved 100 moments",
    threshold: 100,
    type: "moments",
    supportingText: "Your archive is becoming a living record of experience.",
    celebrate: true,
  },
  {
    id: "memory-descriptions",
    title: "Wrote descriptions for your memories",
    threshold: 5,
    type: "descriptions",
    supportingText: "Words are giving your images more staying power.",
  },
  {
    id: "multiple-places",
    title: "Preserved memories across multiple places",
    threshold: 3,
    type: "places",
    supportingText: "Your archive now carries a sense of movement and place.",
  },
];

function getMilestoneValue(stats: JourneyStats, type: JourneyMilestoneType) {
  switch (type) {
    case "galleries":
      return stats.galleryCount;
    case "scenes":
      return stats.sceneCount;
    case "moments":
      return stats.momentCount;
    case "descriptions":
      return stats.describedMemoryCount;
    case "places":
      return stats.distinctPlacesCount;
    default:
      return 0;
  }
}

export function getJourneyStats(galleries: Gallery[]): JourneyStats {
  const sceneCount = galleries.reduce((sum, gallery) => sum + gallery.subgalleries.length, 0);
  const momentCount = galleries.reduce(
    (sum, gallery) =>
      sum +
      gallery.subgalleries.reduce((sceneSum, subgallery) => sceneSum + subgallery.photos.length, 0),
    0,
  );
  const describedMemoryCount = galleries.reduce(
    (sum, gallery) =>
      sum +
      (gallery.description.trim() ? 1 : 0) +
      gallery.subgalleries.reduce(
        (sceneSum, subgallery) =>
          sceneSum +
          (subgallery.description.trim() ? 1 : 0) +
          subgallery.photos.reduce(
            (photoSum, photo) => photoSum + (photo.caption.trim() ? 1 : 0),
            0,
          ),
        0,
      ),
    0,
  );
  const distinctPlaces = new Set<string>();

  galleries.forEach((gallery) => {
    gallery.locations.forEach((place) => {
      if (place.trim()) distinctPlaces.add(place.trim().toLowerCase());
    });
    gallery.subgalleries.forEach((subgallery) => {
      if (subgallery.location.trim()) {
        distinctPlaces.add(subgallery.location.trim().toLowerCase());
      }
    });
  });

  return {
    galleryCount: galleries.length,
    sceneCount,
    momentCount,
    describedMemoryCount,
    distinctPlacesCount: distinctPlaces.size,
  };
}

export function getJourneyStage(galleryCount: number) {
  return (
    journeyStages.find((stage) => {
      const atLeastMinimum = galleryCount >= stage.minGalleries;
      const withinMaximum = stage.maxGalleries === null ? true : galleryCount <= stage.maxGalleries;
      return atLeastMinimum && withinMaximum;
    }) ?? journeyStages[0]
  );
}

export function getJourneySupportCopy(stats: JourneyStats) {
  if (stats.momentCount >= 100) {
    return "A life, quietly documented.";
  }
  if (stats.sceneCount >= 10) {
    return "Your memories are beginning to form a story.";
  }
  if (stats.galleryCount >= 3) {
    return "Another chapter is being preserved.";
  }
  if (stats.galleryCount >= 1) {
    return "Your archive is taking shape.";
  }
  return "The first chapter is waiting to be preserved.";
}

export function getNextJourneyMilestone(stats: JourneyStats) {
  const galleryThresholds = [1, 5, 10, 20];
  const nextGalleryThreshold = galleryThresholds.find((threshold) => stats.galleryCount < threshold);

  if (!nextGalleryThreshold) {
    return {
      label: "Keep shaping your archive",
      detail: "Each new gallery adds another chapter to your story.",
    };
  }

  if (nextGalleryThreshold === 1) {
    return {
      label: "Create your first gallery",
      detail: "The archive begins with a single chapter.",
    };
  }

  return {
    label: `Reach ${nextGalleryThreshold} galleries`,
    detail: `${stats.galleryCount} of ${nextGalleryThreshold} complete`,
  };
}

export function getResolvedJourneyMilestones(stats: JourneyStats): ResolvedJourneyMilestone[] {
  return journeyMilestones.map((milestone) => {
    const progressValue = getMilestoneValue(stats, milestone.type);
    return {
      ...milestone,
      achieved: progressValue >= milestone.threshold,
      progressValue,
      achievedAtLabel: progressValue >= milestone.threshold ? "Reached" : null,
    };
  });
}

export function getLatestCelebratedMilestone(
  milestones: ResolvedJourneyMilestone[],
  shownMilestoneIds: string[],
) {
  const shown = new Set(shownMilestoneIds);
  const candidates = milestones.filter((milestone) => milestone.achieved && milestone.celebrate && !shown.has(milestone.id));
  return candidates.at(-1) ?? null;
}

export function getJourneyLineModel(galleryCount: number): JourneyLineModel {
  const currentStage = getJourneyStage(galleryCount);
  const currentStageIndex = journeyStages.findIndex((stage) => stage.id === currentStage.id);
  const nextStage = journeyStages[currentStageIndex + 1] ?? null;
  const points = journeyStages.map((stage, index) => ({
    stage,
    position:
      journeyStages.length === 1
        ? 0
        : (index / (journeyStages.length - 1)) * 100,
    isCurrent: stage.id === currentStage.id,
    isNext: stage.id === nextStage?.id,
  }));

  const currentPoint = points[currentStageIndex] ?? points[0];
  const nextPoint = nextStage ? points[currentStageIndex + 1] : null;

  if (!nextStage || !nextPoint) {
    return {
      currentStage,
      nextStage: null,
      points,
      currentPosition: 100,
      remainingToNextStage: null,
      progressLabel: "Your archive continues to deepen.",
    };
  }

  const stageMax = currentStage.maxGalleries ?? currentStage.minGalleries;
  const segmentProgress = Math.max(
    0,
    Math.min(
      1,
      (galleryCount - currentStage.minGalleries + 1) /
        (stageMax - currentStage.minGalleries + 2),
    ),
  );
  const currentPosition =
    currentPoint.position + (nextPoint.position - currentPoint.position) * segmentProgress;
  const remainingToNextStage = Math.max(0, nextStage.minGalleries - galleryCount);
  const progressLabel =
    remainingToNextStage === 1
      ? `1 more gallery to reach ${nextStage.name}`
      : `${remainingToNextStage} more galleries to reach ${nextStage.name}`;

  return {
    currentStage,
    nextStage,
    points,
    currentPosition,
    remainingToNextStage,
    progressLabel,
  };
}
