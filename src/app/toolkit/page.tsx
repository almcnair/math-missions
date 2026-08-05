// /toolkit — Lab Leader Toolkit hub.
//
// Adult-facing collection: teacher moves, brain breaks, jeopardy (coming),
// and other tools the person running the room reaches for.
//
// UI lives in <CollectionHub />; content is driven from
//   src/content/toolkit/tools.json (collections[].id === "lab-leader")
//
// Sibling hub: /resources (Debater Resources — student-facing).

import CollectionHub from "@/components/toolkit/CollectionHub";

export const metadata = {
  title: "Lab Leader Toolkit · Math Missions",
  description:
    "Everything a CDSI lab leader needs to run a great debate class — teacher moves, brain breaks, and projection tools.",
};

export default function LabLeaderToolkitHubPage() {
  return (
    <CollectionHub
      collectionId="lab-leader"
      moreComingNote="Policy debate Jeopardy games and other adult-facing tools slot in as they ship. Every tool page shares this switcher — the wordmark at the top-left of any tool drops down a menu of the whole toolkit."
    />
  );
}
