export type CaseStudy = {
  slug: string;
  title: string;
  category: string;
  paragraphs: string[];
  video?: string;
};

export const caseStudies: CaseStudy[] = [
  {
    slug: "hy-group-rochdale-100",
    title: "HY Group : The Rochdale 100 initiative",
    category: "Documentary series",
    paragraphs: [
      "Following the increasing momentum of the For Generations To Come movement, the Rochdale 100 initiative was born, aimed at supporting first time buyers in Rochdale onto the property ladder.",
      "In order for this not to be perceived as anything other than a pay it forward project, we chose to tell the story in a documentary style to include stories of the owners - two Rochdale lads who share a deep love and pride for the place they call home, as well as stories of people within the borough who are on their house buying journey.",
      "This is David's intro video to that series.",
    ],
    video: "/video/1. David - My Town Intro.mp4",
  },
  {
    slug: "case-study-two",
    title: "Case Study Two",
    category: "Documentary series",
    paragraphs: ["Case study content coming soon."],
    video: "/video/2. Dean - My Town Intro.mp4",
  },
  {
    slug: "case-study-three",
    title: "Case Study Three",
    category: "Social Media",
    paragraphs: ["Case study content coming soon."],
  },
  {
    slug: "case-study-four",
    title: "Case Study Four",
    category: "Film & Photo",
    paragraphs: ["Case study content coming soon."],
  },
  {
    slug: "case-study-five",
    title: "Case Study Five",
    category: "Strategy",
    paragraphs: ["Case study content coming soon."],
  },
];

export const caseStudyAnchor = (slug: string) => `case-${slug}`;
