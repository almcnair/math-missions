// /resources — Debater Resources hub.
//
// Student-facing collection: glossary, slide decks (coming), graphic
// organizers (coming). The stuff a student reaches for solo — reference,
// study material, worksheets.
//
// UI lives in <CollectionHub />; content is driven from
//   src/content/toolkit/tools.json (collections[].id === "debater")
//
// Sibling hub: /toolkit (Lab Leader Toolkit — adult-facing).

import CollectionHub from "@/components/toolkit/CollectionHub";

export const metadata = {
  title: "Debater Resources · Math Missions",
  description:
    "Reference material and study tools for policy debate students — glossary, slide decks, and graphic organizers.",
};

export default function DebaterResourcesHubPage() {
  return (
    <CollectionHub
      collectionId="debater"
      moreComingNote="More study aids and reference material slot in here as they ship."
    />
  );
}
