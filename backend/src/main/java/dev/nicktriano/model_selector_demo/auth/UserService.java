package dev.nicktriano.model_selector_demo.auth;

import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class UserService {
  
  private final UserRepository userRepository;

  UserService(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  UserEntity saveUserOnLogin(
    String googleSub,
    String email,
    String displayName,
    String pictureUrl
  ) {
    return userRepository.findByGoogleSub(googleSub).map((UserEntity presentUser) -> {
      presentUser.setLastLoginAt(Instant.now());
      return userRepository.save(presentUser);
    }).orElseGet(() -> {
      UserEntity newUser = new UserEntity();
      newUser.setGoogleSub(googleSub);
      newUser.setEmail(email);
      newUser.setDisplayName(displayName);
      newUser.setPictureUrl(pictureUrl);
      newUser.setLastLoginAt(Instant.now());

      return userRepository.save(newUser);
    });

  }
}
