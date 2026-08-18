import { describe, it, expect } from 'vitest';
import type { PublicTutorDto } from '@mentora/shared';
import { adaptPublicTutor } from './tutorAdapter';

const baseDto: PublicTutorDto = {
  id: 'u_1',
  name: 'Ada Eze',
  photoUrl: 'https://example.com/ada.jpg',
  professionalTitle: 'Machine Learning Engineer',
  bio: 'I teach ML hands-on.',
  country: 'Nigeria',
  city: 'Lagos',
  languages: ['English', 'Yoruba'],
  subjects: ['Python', 'Machine Learning'],
  gradeLevels: ['University / Undergraduate'],
  yearsExperience: '3-5 years',
  qualification: "Master's Degree",
  teachingFormats: ['ONLINE'],
  sessionDurationMinutes: 60,
  sessionPrice: 8000,
  rating: 4.8,
  reviewCount: 12,
  studentsTaught: 40,
  availabilityDays: [1, 2, 3, 4, 5],
};

describe('adaptPublicTutor', () => {
  it('maps backend fields onto the catalog shape', () => {
    const tutor = adaptPublicTutor(baseDto);
    expect(tutor.id).toBe('u_1');
    expect(tutor.name).toBe('Ada Eze');
    expect(tutor.photo).toBe(baseDto.photoUrl);
    expect(tutor.category).toBe('ai');
    expect(tutor.tags).toEqual(['Python', 'Machine Learning']);
    expect(tutor.experienceYears).toBe(3);
    expect(tutor.rating).toBe(4.8);
    expect(tutor.reviews).toBe(12);
    expect(tutor.education).toBe("Master's Degree");
    expect(tutor.type).toBe('expert');
    expect(tutor.sessionTypes).toEqual(['online']);
    expect(tutor.price).toBe(8000);
    expect(tutor.location).toBe('Lagos, Nigeria');
    expect(tutor.languages).toEqual([
      { name: 'English', level: '' },
      { name: 'Yoruba', level: '' },
    ]);
    expect(tutor.expertise).toEqual(['Python', 'Machine Learning']);
    expect(tutor.studentsTaught).toBe(40);
    expect(tutor.verified).toBe(true);
  });

  it('includes in-person as a session type when supported', () => {
    const tutor = adaptPublicTutor({ ...baseDto, teachingFormats: ['ONLINE', 'IN_PERSON'] });
    expect(tutor.sessionTypes).toEqual(['online', 'in-person']);
  });

  it('keeps missing optional profile data empty instead of fabricating it', () => {
    const tutor = adaptPublicTutor({
      ...baseDto,
      photoUrl: null,
      professionalTitle: null,
      bio: null,
      qualification: null,
      city: null,
      subjects: [],
      sessionPrice: null,
      availabilityDays: [],
    });
    expect(tutor.photo).toBeUndefined();
    expect(tutor.title).toBe('Tutor');
    expect(tutor.bio).toBe('This tutor has not added a bio yet.');
    expect(tutor.type).toBe('university');
    expect(tutor.location).toBe('Nigeria');
    expect(tutor.expertise).toEqual([]);
    expect(tutor.price).toBe(0);
  });

  it('maps qualification to professional/expert types', () => {
    expect(adaptPublicTutor({ ...baseDto, qualification: "Bachelor's Degree" }).type).toBe('professional');
    expect(adaptPublicTutor({ ...baseDto, qualification: 'PhD / Doctorate' }).type).toBe('expert');
  });

  it('infers category from subject keywords', () => {
    expect(adaptPublicTutor({ ...baseDto, subjects: ['Calculus', 'Physics'] }).category).toBe('math');
    expect(adaptPublicTutor({ ...baseDto, subjects: ['Public Speaking'] }).category).toBe('speaking');
    expect(adaptPublicTutor({ ...baseDto, subjects: ['Entrepreneurship'] }).category).toBe('business');
  });
});
