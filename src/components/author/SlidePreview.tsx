"use client";

// Live preview of a single slide, using the real MissionPlayer slide
// renderers so what authors see is what students see.

import type { Slide } from "@/lib/mission-schema";
import {
  HookSlideView,
  DefineSlideView,
  ConceptSlideView,
  StrategySlideView,
  CompleteSlideView,
} from "@/components/mission/slides/ContentSlides";
import {
  McqSlideView,
  MultiSlideView,
  SortSlideView,
  OrderSlideView,
  MatchSlideView,
  FillSlideView,
  LabelSlideView,
  HighlightSlideView,
} from "@/components/mission/slides/CfuSlides";

const noopResult = () => {};

export function SlidePreview({ slide }: { slide: Slide }) {
  switch (slide.type) {
    case "hook":
      return <HookSlideView slide={slide} />;
    case "define":
      return <DefineSlideView slide={slide} />;
    case "concept":
      return <ConceptSlideView slide={slide} />;
    case "strategy":
      return <StrategySlideView slide={slide} />;
    case "cfu-mcq":
      return <McqSlideView slide={slide} onResult={noopResult} />;
    case "cfu-multi":
      return <MultiSlideView slide={slide} onResult={noopResult} />;
    case "cfu-sort":
      return <SortSlideView slide={slide} onResult={noopResult} />;
    case "cfu-order":
      return <OrderSlideView slide={slide} onResult={noopResult} />;
    case "cfu-match":
      return <MatchSlideView slide={slide} onResult={noopResult} />;
    case "cfu-fill":
      return <FillSlideView slide={slide} onResult={noopResult} />;
    case "cfu-label":
      return <LabelSlideView slide={slide} onResult={noopResult} />;
    case "cfu-highlight":
      return <HighlightSlideView slide={slide} onResult={noopResult} />;
    case "complete":
      return (
        <CompleteSlideView
          slide={slide}
          dynamics={{
            credits: 50,
            accuracy: 0.9,
            unlockedNext: "Next mission",
            rankDelta: "+100",
          }}
          onPrimary={noopResult}
          onSecondary={noopResult}
        />
      );
    default:
      // exhaustive fallback
      return <pre className="text-text-dim text-sm">{JSON.stringify(slide, null, 2)}</pre>;
  }
}
