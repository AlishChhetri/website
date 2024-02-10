import React from "react";

import styles from "./About.module.css";
import { getImageUrl } from "../../utils";

export const About = () => {
  return (
    <section className={styles.container} id="about">
      <h2 className={styles.title}>About</h2>
      <div className={styles.content}>
        <img
          src={getImageUrl("about/aboutImage.png")}
          alt="Me sitting with a laptop"
          className={styles.aboutImage}
        />
        <ul className={styles.aboutItems}>
          <li className={styles.aboutItem}>
            <div className={styles.aboutItemText}>
              <h3>👨🏽‍💻 Software Engineer 👨🏽‍💻</h3>
              <p>
              Navigating the software engineering path with peers while creating innovative tools.
              </p>
            </div>
          </li>
          <li className={styles.aboutItem}>
            <div className={styles.aboutItemText}>
              <h3>👨🏾‍🏫 Technical Leader 👨🏾‍🏫</h3>
              <p>
                Supporting peers throughout their academic journey.
              </p>
            </div>
          </li>
          <li className={styles.aboutItem}>
            <div className={styles.aboutItemText}>
              <h3>🎮 President of Allegheny College Esports 🎮</h3>
              <p>
              Fostering a community through dynamic club activities and effective resource management.
              </p>
            </div>
          </li>
        </ul>
      </div>
    </section>
  );
};
