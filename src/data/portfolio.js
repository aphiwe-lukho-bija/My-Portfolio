/* portfolio.js — every piece of content on the site, in one place.

   Edit this file to change the text. Nothing here is invented: each entry
   comes from your existing site or your CV details. Anything that is still
   missing is marked  placeholder: true  and shows as a clearly labelled
   "to add" slot. Set SHOW_PLACEHOLDERS to false to hide all of them. */

import profileImg from '../../pictures/profile.jpg'
import readingImg from '../../pictures/reading.jpg'
import soccerImg from '../../pictures/soccer.jpg'
import programmingImg from '../../pictures/programming.jpg'
import amapianoImg from '../../pictures/amapiano.jpg'
import runningImg from '../../pictures/running.jpg'
import speakingImg from '../../pictures/public-speaking.jpg'
import cyberPdf from '../../pictures/Introduction_to_Cybersecurity_certificate_aphiwelukhobija-gmail-com_a4805615-39f0-4a56-b456-e5fd8893cecb.pdf'
import dataPdf from '../../pictures/Introduction_to_Data_Science_certificate_aphiwelukhobija-gmail-com_8091f3fc-f7a0-4392-b7b9-2f954c3c66fd.pdf'

export const SHOW_PLACEHOLDERS = true

export const person = {
  name: 'Aphiwe Lukho Bija',
  monogram: 'ALB',
  title: 'Software development intern',
  location: 'Cape Town, South Africa',
  email: 'aphiwelukhobija@gmail.com',
  linkedin: 'https://www.linkedin.com/in/aphiwe-lukho-bija-027539408',
  github: 'https://github.com/aphiwe-lukho-bija',
  photo: profileImg,
  photoAlt: 'Portrait of Aphiwe Lukho Bija',
  // taken from the existing site copy
  intro:
    'I’m a 23-year-old developer who enjoys solving problems, learning new technologies, and building applications that provide real-world value. Coding puts me in a flow state. Every challenge is an opportunity to grow.',
  currently: 'Working as a software development intern.'
}

/* the quiet facts under the hero */
export const heroFacts = [
  { label: 'Based in', value: 'Cape Town, South Africa' },
  { label: 'Completed', value: 'YouthCode Software Development, October 2026' },
  { label: 'Currently', value: 'Software development intern' }
]

export const about = {
  heading: 'About',
  paragraphs: [
    'I am a 23-year-old software development intern building practical experience through real-world coding projects.',
    'I enjoy solving problems, learning new technologies, and creating applications that provide real-world value. Communication is one of my strengths, and I enjoy presenting technical concepts clearly.',
    'Coding puts me in a flow state. Every challenge is an opportunity to grow, every mistake is a lesson, and every solution reminds me how rewarding persistence can be.',
    'Alongside my studies, I completed training as a GBVF Ambassador, strengthening my leadership, advocacy, and communication skills.'
  ],
  highlights: ['23 years old', 'Software development intern', 'GBVF Ambassador', 'Clear communicator']
}

export const goals = {
  heading: 'Goals',
  paragraphs: [
    'My goal is to excel in my software development internship and keep growing through disciplined daily habits.',
    'I am drawn to the connection between technology and business. After completing my course, I plan to expand my skills into Data Engineering.',
    'I want to contribute to improving the lives of South Africans through meaningful technological solutions and eventually create employment opportunities in tech.'
  ],
  steps: [
    { title: 'Grow as an intern', text: 'Make the most of my software development internship through disciplined daily habits.' },
    { title: 'Grow into Data Engineering', text: 'Expand my skills where technology and business meet, starting with data engineering.' },
    { title: 'Build for my community', text: 'Create meaningful solutions for South Africans and eventually open doors for others in tech.' }
  ]
}

/* ------------------------------------------------------------------ */
/* Projects — real case studies only                                   */
/* ------------------------------------------------------------------ */
export const projects = [
  {
    id: 'applydirect',
    title: 'ApplyDirect SA',
    kind: 'Team project · Full-stack web application',
    purpose:
      'A full-stack web application that helps students access and manage university-related opportunities through one platform.',
    problem:
      'Students need one place to reach and manage university-related opportunities, and the application has to work as a whole: the screens, the routing and the backend all need to connect.',
    contribution:
      'Developed the Login page: a simple, user-friendly interface for students to access their accounts, properly connected to the rest of the application and to our backend authentication.',
    technologies: ['Vue.js', 'Node.js', 'Express.js', 'MySQL', 'REST APIs', 'Git', 'GitHub'],
    decisions: [
      'Kept the login interface simple and user-friendly, so students can reach their accounts without friction.',
      'Connected the page through routing and to the backend authentication, so it worked as part of the whole application and not on its own.',
      'Worked in separate Git branches and merged our individual contributions into one application, resolving issues together as a team.',
      'Biggest lesson: building a full-stack application is not only writing code. Communication, teamwork, problem-solving and testing that the different parts work together matter just as much.'
    ],
    links: [
      { label: 'Source code on GitHub', href: 'https://lnkd.in/dmAQDEpE' },
      { label: 'Figma design', href: 'https://lnkd.in/dZmnXZJU' },
      { label: 'Live site', href: 'https://lnkd.in/d25a67Df' }
    ]
  },
  {
    id: 'portfolio',
    title: 'This portfolio',
    kind: 'Personal website',
    purpose:
      'A single place where a recruiter or collaborator can see who I am, what I have learned and how I work.',
    problem:
      'A portfolio has to be readable before it is impressive. The challenge was to give it a living, cinematic background and an optional 3D chess game without slowing the page down or getting in the way of the content.',
    contribution:
      'The whole site: the layout and type system, the animated background, a playable 3D chess board with its own rules engine and computer opponent, and the written content.',
    technologies: ['Vue 3', 'Vite', 'JavaScript', 'CSS', 'WebGL (GLSL)', 'Three.js'],
    decisions: [
      'The background is one fragment shader in plain WebGL instead of a 3D library, so it costs kilobytes, not hundreds of kilobytes. It draws at reduced resolution, lowers itself on slow devices, stops when the tab is hidden, and falls back to CSS gradients if WebGL is unavailable.',
      'The chess scene is loaded only when a visitor opens it, so it never slows the first visit. It runs the computer opponent in a Web Worker so the board stays smooth while it thinks.',
      'The chess rules are a purpose-built engine, checked against published move-count tests (perft) that cover castling, en passant and promotion.',
      'Visitors who prefer reduced motion get a still background and no intro animation, and every control works from the keyboard.'
    ],
    links: [
      { label: 'GitHub profile', href: person.github },
      { label: 'Repository on GitHub', href: 'https://github.com/aphiwe-lukho-bija/My-Portfolio.git' },
      { label: 'Live site', placeholder: true, note: 'Add the live site link once it is published' }
    ]
  }
]

/* ------------------------------------------------------------------ */
/* Skills — grouped by the evidence behind them                        */
/* ------------------------------------------------------------------ */
export const skills = [
  {
    heading: 'Used in my projects',
    note: 'ApplyDirect SA and this portfolio.',
    items: [
      { name: 'Vue.js', where: 'ApplyDirect SA login page and routing; this portfolio' },
      { name: 'JavaScript', where: 'Interaction, the chess engine and its AI' },
      { name: 'CSS', where: 'Fluid layout, responsive design, motion' },
      { name: 'REST APIs', where: 'Connecting the login page to backend authentication' },
      { name: 'Node.js and Express.js', where: 'The ApplyDirect SA team backend' },
      { name: 'MySQL', where: 'The ApplyDirect SA team database' },
      { name: 'Git and GitHub', where: 'Branches, merging and team collaboration' },
      { name: 'WebGL, GLSL and Three.js', where: 'This portfolio’s background and 3D chess scene' }
    ]
  },
  {
    heading: 'Studied',
    note: 'Courses and certificates completed.',
    items: [
      { name: 'Front-end development', where: 'YouthCode Software Development Project' },
      { name: 'Database and back-end development', where: 'YouthCode Software Development Project' },
      { name: 'E-commerce', where: 'YouthCode Software Development Project' },
      { name: 'Introduction to ICT', where: 'YouthCode Software Development Project' },
      { name: 'Cybersecurity fundamentals', where: 'Introduction to Cybersecurity certificate' },
      { name: 'Data science fundamentals', where: 'Introduction to Data Science certificate' }
    ]
  },
  {
    heading: 'Working with people',
    note: 'Skills from work, training and team projects.',
    items: [
      { name: 'Teamwork', where: 'ApplyDirect SA: shared branches, issues and merging' },
      { name: 'Communication', where: 'Explaining technical ideas clearly' },
      { name: 'Public speaking', where: 'GBVF Ambassador training' },
      { name: 'Leadership and advocacy', where: 'GBVF Ambassador, NICDAM' },
      { name: 'Customer support', where: 'Call Center Support Associate, WHO' }
    ]
  }
]

/* ------------------------------------------------------------------ */
/* Experience and education                                            */
/* ------------------------------------------------------------------ */
export const experience = [
  {
    period: 'Present',
    role: 'Software development intern',
    org: '',
    placeholder: true,
    orgNote: 'Add the company name',
    text: 'Building practical experience through real-world coding projects.'
  },
  {
    period: 'Sept 2023 – July 2024',
    role: 'Call Center Support Associate',
    org: 'WHO',
    text: ''
  },
  {
    period: 'July 2022 – July 2023',
    role: 'GBVF Ambassador',
    org: 'NICDAM',
    text: 'Training that strengthened my leadership, advocacy, communication and presentation skills.'
  }
]

export const education = [
  {
    period: '2 October 2026',
    title: 'YouthCode Software Development Project',
    org: 'Life Choices Academy',
    text: 'Modules: Introduction to ICT, Front-End Development, Database and Back-End Development, E-commerce, and Personal and Professional Development.'
  },
  {
    period: '2021',
    title: 'National Senior Certificate (matric)',
    org: 'Bethel College High School',
    text: ''
  }
]

export const certificates = [
  {
    title: 'Introduction to Cybersecurity',
    text: 'Foundations of online safety, threat awareness and secure behaviour, completed as part of my continuous professional development.',
    pdf: cyberPdf
  },
  {
    title: 'Introduction to Data Science',
    text: 'Core data science concepts: data handling, analysis and the role of data in decision-making. It supports my path toward Data Engineering.',
    pdf: dataPdf
  }
]

/* ------------------------------------------------------------------ */
/* Interests and contact                                               */
/* ------------------------------------------------------------------ */
export const interests = {
  heading: 'Beyond the code',
  lead: 'The things that keep me curious, focused and inspired.',
  items: [
    { title: 'Reading and self-development', text: 'Reading puts me in a flow state. I enjoy learning from self-development books.', img: readingImg },
    { title: 'Soccer', text: 'I support Manchester City and never miss the chance to watch my team play.', img: soccerImg },
    { title: 'Programming', text: 'Coding is more than a career to me. I love solving problems and building useful things.', img: programmingImg },
    { title: 'Amapiano music', text: 'I enjoy relaxed Amapiano by Kelvin Momo and Kabza De Small.', img: amapianoImg },
    { title: 'Long-distance running', text: 'Health is wealth, so I stay fit with long-distance treadmill runs.', img: runningImg },
    { title: 'Public speaking', text: 'GBVF Ambassador training strengthened my confidence and presentation skills.', img: speakingImg }
  ]
}

export const contact = {
  heading: 'Contact',
  lead: 'Have a project in mind, or just want to say hello? My inbox is always open.',
  items: [
    { label: 'Email', value: person.email, href: `mailto:${person.email}`, icon: 'mail' },
    { label: 'LinkedIn', value: 'Aphiwe Lukho Bija', href: person.linkedin, icon: 'linkedin' },
    { label: 'GitHub', value: 'aphiwe-lukho-bija', href: person.github, icon: 'github' },
    { label: 'Location', value: person.location, href: '', icon: 'pin' }
  ]
}
