import React from "react";
import { Composition, registerRoot } from "remotion";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import { LakeShort, LAKE_FRAMES } from "./videos/lake/Lake";
import { SeaShort, SEA_FRAMES } from "./videos/sea/Sea";
import { MolShort, MOL_FRAMES } from "./videos/mol/Mol";

const Root: React.FC = () => (
  <>
    <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="LakeShort" component={LakeShort} durationInFrames={LAKE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="SeaShort" component={SeaShort} durationInFrames={SEA_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="MolShort" component={MolShort} durationInFrames={MOL_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
registerRoot(Root);
