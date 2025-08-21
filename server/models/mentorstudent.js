import mongoose from 'mongoose';

const mentorStudentSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  }
});

const MentorStudent = mongoose.model('MentorStudent', mentorStudentSchema);
export default MentorStudent;
