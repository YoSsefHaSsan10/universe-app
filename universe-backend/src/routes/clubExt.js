const express = require("express");
const router  = express.Router();
const path    = require("path");
const multer  = require("multer");
const ctrl    = require("../controllers/clubExtController");
const { authMiddleware } = require("../middleware/auth");

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "../../uploads"),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.round(Math.random()*1e6)}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = [".jpg",".jpeg",".png",".gif",".webp"];
    cb(null, ok.includes(path.extname(file.originalname).toLowerCase()));
  },
});

router.use(authMiddleware);

// Club announcements
router.get("/:id/announcements",       ctrl.getClubAnnouncements);
router.post("/:id/announcements",      ctrl.createClubAnnouncement);
router.delete("/:id/announcements/:aid", ctrl.deleteClubAnnouncement);

// Club events
router.get("/:id/events",   ctrl.getClubEvents);
router.post("/:id/events",  ctrl.createClubEvent);

// Club gallery
router.get("/:id/gallery",         ctrl.getGallery);
router.post("/:id/gallery",        upload.single("image"), ctrl.uploadGallery);
router.delete("/:id/gallery/:gid", ctrl.deleteGalleryItem);

module.exports = router;
