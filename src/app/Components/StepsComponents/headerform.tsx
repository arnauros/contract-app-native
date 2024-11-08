import React from "react";

import IconButton from "../StepsComponents/IconButton";
import Tooltip from "../tooltip";

interface TopHeadingProps {
  title: string;
}

const TopHeading: React.FC<TopHeadingProps> = ({ title }) => {
  return (
    <header className="flex gap-10 justify-between items-center px-3 py-3 w-full text-sm tracking-wide text-gray-600 bg-neutral-100 rounded-t-lg">
      <div className="flex gap-1 items-center self-stretch my-auto">
        <Tooltip text="Make sure you fill out all the details you need to make it the best contract possible">
          <IconButton
            src="https://cdn.builder.io/api/v1/image/assets/06d3b22f50a040fd8319223415cf3485/268770adce8beafcb32ed1b7e81034a7a2c181f5a880850b90cc90fa74eb70db?apiKey=06d3b22f50a040fd8319223415cf3485&"
            alt="Info icon"
          />
        </Tooltip>
        <h1 className="self-stretch my-auto">{title}</h1>
      </div>
      <IconButton
        src="https://cdn.builder.io/api/v1/image/assets/06d3b22f50a040fd8319223415cf3485/3366a55cc9db6b5c30e90fe6695aef50bdb59715a383faed10e07e42e11f1e54?apiKey=06d3b22f50a040fd8319223415cf3485&"
        alt="Close icon"
      />
    </header>
  );
};

export default TopHeading;
