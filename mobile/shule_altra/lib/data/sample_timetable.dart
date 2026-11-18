/// Fictional lessons for a selectable sample day. Never school records.
library;

typedef SampleLesson = ({String time, String subject, String teacher});

const sampleTimetable = <String, List<SampleLesson>>{
  'Monday': [
    (time: '08:00 – 08:40', subject: 'Mathematics', teacher: 'Teacher A'),
    (time: '08:40 – 09:20', subject: 'English', teacher: 'Teacher B'),
    (time: '09:20 – 10:00', subject: 'Biology', teacher: 'Teacher C'),
  ],
  'Tuesday': [
    (time: '08:00 – 08:40', subject: 'History', teacher: 'Teacher D'),
    (time: '08:40 – 09:20', subject: 'Kiswahili', teacher: 'Teacher E'),
    (time: '09:20 – 10:00', subject: 'Geography', teacher: 'Teacher F'),
  ],
  'Wednesday': [
    (time: '08:00 – 08:40', subject: 'Civics', teacher: 'Teacher G'),
    (time: '08:40 – 09:20', subject: 'Chemistry', teacher: 'Teacher H'),
    (time: '09:20 – 10:00', subject: 'English', teacher: 'Teacher B'),
  ],
  'Thursday': [
    (time: '08:00 – 08:40', subject: 'Physics', teacher: 'Teacher I'),
    (time: '08:40 – 09:20', subject: 'Mathematics', teacher: 'Teacher A'),
    (time: '09:20 – 10:00', subject: 'History', teacher: 'Teacher D'),
  ],
  'Friday': [
    (time: '08:00 – 08:40', subject: 'Geography', teacher: 'Teacher F'),
    (time: '08:40 – 09:20', subject: 'Biology', teacher: 'Teacher C'),
    (time: '09:20 – 10:00', subject: 'Kiswahili', teacher: 'Teacher E'),
  ],
};
