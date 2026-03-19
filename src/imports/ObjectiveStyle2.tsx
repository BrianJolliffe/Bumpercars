function Text() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Text">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[12px] text-[rgba(32,32,32,0.7)] tracking-[-0.2px] uppercase">Campaign Objective</p>
    </div>
  );
}

function Text1() {
  return (
    <div className="content-stretch flex h-[23.5px] items-start relative shrink-0 w-[106.461px]" data-name="Text">
      <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[24px] not-italic relative shrink-0 text-[#202020] text-[18px] tracking-[-0.2px]">Conversion</p>
    </div>
  );
}

function V7Icon() {
  return (
    <div className="content-stretch flex h-[16px] items-center justify-center relative shrink-0" data-name="v7-icon">
      <div className="flex flex-col font-['Font_Awesome_7_Pro:Regular',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[#f26318] text-[16px] text-center whitespace-nowrap">
        <p className="leading-[normal]">edit</p>
      </div>
    </div>
  );
}

function FaIcon() {
  return (
    <div className="content-stretch flex h-[17px] items-start relative shrink-0" data-name="FA Icon">
      <V7Icon />
    </div>
  );
}

function Base() {
  return (
    <div className="content-stretch flex gap-[4px] items-center justify-center relative shrink-0" data-name="Base">
      <FaIcon />
      <p className="font-['Inter:Medium',sans-serif] font-medium leading-[20px] not-italic relative shrink-0 text-[#f26318] text-[13px] tracking-[0.46px]">Change</p>
    </div>
  );
}

function Frame3() {
  return (
    <div className="content-stretch flex gap-[4px] items-center relative shrink-0">
      <Text1 />
      <Base />
    </div>
  );
}

function Frame1() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-[153px]">
      <Text />
      <Frame3 />
    </div>
  );
}

function Paragraph() {
  return (
    <div className="h-[20px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[20px] left-0 not-italic text-[14px] text-[rgba(32,32,32,0.7)] top-[0.5px] tracking-[-0.1504px]">Drive valuable actions on your website or app, such as purchases, sign-ups, or downloads.</p>
    </div>
  );
}

function Paragraph1() {
  return (
    <div className="h-[16px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute font-['Inter:Italic',sans-serif] font-normal italic leading-[16px] left-0 text-[12px] text-[rgba(32,32,32,0.7)] top-px">{`Your campaign's Objective is determined automatically by the first audience selected.`}</p>
    </div>
  );
}

function Frame() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-full">
      <Paragraph />
      <Paragraph1 />
    </div>
  );
}

function Frame2() {
  return (
    <div className="flex-[1_0_0] min-h-px min-w-px relative">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[8px] items-start relative w-full">
        <Frame1 />
        <Frame />
      </div>
    </div>
  );
}

function Container() {
  return (
    <div className="content-stretch flex items-start relative shrink-0 w-full" data-name="Container">
      <Frame2 />
    </div>
  );
}

export default function ObjectiveStyle() {
  return (
    <div className="bg-gradient-to-r content-stretch flex flex-col from-[#fbf1e6] items-start p-[24px] relative rounded-[4px] size-full to-[#fffcf8]" data-name="ObjectiveStyle2">
      <Container />
    </div>
  );
}