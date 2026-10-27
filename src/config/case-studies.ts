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
    title: "",
    category: "Documentary series",
    paragraphs: [
      "Following the increasing momentum of the For Generations To Come movement, the Rochdale 100 initiative was born, aimed at supporting first time buyers in Rochdale onto the property ladder.",
      "In order for this not to be perceived as anything other than a pay it forward project, we chose to tell the story in a documentary style to include stories of the owners - two Rochdale lads who share a deep love and pride for the place they call home, as well as stories of people within the borough who are on their house buying journey.",
      "This is David's intro video to that series.",
    ],
    video: "https://res.cloudinary.com/aeh9u82k/video/upload/v1793105014/1._David_-_My_Town_Intro.mp4",
  },
  {
    slug: "case-study-two",
    title: "",
    category: "Documentary series",
    paragraphs: ["Case study content coming soon."],
    video: "https://res.cloudinary.com/aeh9u82k/video/upload/v1793105372/2._Dean_-_My_Town_Intro.mp4",
  },
  {
    slug: "case-study-three",
    title: "",
    category: "Social Media",
    paragraphs: ["Case study content coming soon."],
  },
  {
    slug: "case-study-four",
    title: "",
    category: "Film & Photo",
    paragraphs: ["Case study content coming soon."],
  },
  {
    slug: "case-study-five",
    title: "",
    category: "Strategy",
    paragraphs: ["Case study content coming soon."],
  },
];

export const caseStudyAnchor = (slug: string) => `case-${slug}`;
